# Self-test runner records no launch-failure detail, errored runs are undiagnosable

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-07
**Store:** kit-level (runner tool code + guard test).
**Owning file:** `.cortex/.tests/catalyst/lib/runner.mjs` (`runTest` / `judgeOutcome`).
**Recurrence of:** none found. The incident scan over `.cortex/incidents/` shows no prior report of this failure; the closest sibling (2026-08-04-runner-closes-in-flight-agent) covers a different runner defect.

## What the user wanted

A self-test run that errors on a judge (or actor) launch failure must leave a record that can be diagnosed after the fact: exit code, stderr, and a stdout tail, whatever the invoker observed. An errored run carrying no failure detail is a dead record.

## What went wrong

Two runs of `test-first-fix-discipline` came back 1/4 with the three semantic criteria marked `unverified: 'judge run errored; criterion left unverified'`:

- `.cortex/.tests/catalyst/test-first-fix-discipline/history/2026-08-07T21-19-02.json` — `errored: true`, `judge_reasoning: null`
- `.cortex/.tests/catalyst/test-first-fix-discipline/history/2026-08-07T21-24-34.json` — `errored: true`, `judge_reasoning: null`

The run records carry no stderr, no exit code, and no output from the failed judge launch. The `-log.md` of run 21-19-02 shows the judge section reduced to the marker `(judge launch failed or produced no report)` with the actor's transcript ending cleanly at its final report. The cause of the launch failure is undiagnosable from the record. An instrumented rerun (`2026-08-07T21-31-42.json`) passed 4/4, proving the judge machinery itself was fine and the failure was in the launch/record path.

## Root cause

Confirmed by reading the code — the failure detail is captured and then thrown away:

1. `dispatch.mjs` `makeRealInvoker` already returns `{ code, stdout, stderr }` on a failed launch (`code !== 0`): "A failed launch ... is left for the runner to record as an errored run; there is nothing to capture."
2. `runner.mjs` `judgeOutcome` discards it: on `judgeRes.code !== 0` it returns `{ errored: true }` and nothing else. The same for the actor path: `runTest` marks criteria `unverified` with the generic detail `'actor launch failed; criterion left unverified'`.
3. The run record schema has no field for launch failure detail, and the `-log.md` writes the bare marker `(judge launch failed or produced no report)` instead of the observed stderr/stdout.

Fresh-agent-repeatable: any failed judge or actor launch produces an equally empty record.

## Fix

`.cortex/.tests/catalyst/lib/runner.mjs` and `.cortex/.tests/catalyst/lib/history.mjs`, plus one export in `.cortex/.tests/catalyst/lib/dispatch.mjs`:

- `boundedTail` is exported from `dispatch.mjs` (it already owned the tail-bounding helper and `REPORT_TAIL_LIMIT`).
- `judgeOutcome` now returns, on a non-zero launch exit, `{ errored: true, launch_error: { role: 'judge', code, stderr, stdout_tail } }`; the actor failure path in `runTest` builds the same shape with `role: 'actor'`. `stdout_tail` is the invoker-observed stdout bounded by `REPORT_TAIL_LIMIT`.
- The run record gains an optional `launch_error` field, present only on a failed launch. Old records without the field still load: `latestPrior` JSON-parses records as-is and `renderMarkdown` renders the field only when present, so the schema is backward compatible.
- The per-run `-log.md` replaces the bare failure marker with the detail block (`(judge launch failed: exit 7)` plus stderr and stdout tail verbatim), and the actor section carries the same block when the actor launch failed.
- `renderMarkdown` gains a `- Launch error: <role> launch exited <code>` line and a `## Launch error` section (stderr and stdout tail in code blocks).

## Verification

Guard test: the existing lib unit suite, extended in `.cortex/.tests/catalyst/lib/runner.test.mjs` with two tests written first, per `catalyst-v2-sdd-rules`:

- `a failed judge launch records exit code, stderr, and a stdout tail on the run record, its JSON, the log, and the md` — forced judge launch failure (`code: 7`, stderr `c2d: dispatch refused: provider 401`) must yield `launch_error` on the in-memory record, the on-disk JSON, the `-log.md`, and the rendered `.md`.
- `a failed actor launch records its exit code, stderr, and stdout tail on the run record` — forced actor launch failure (`code: 127`, `c2d: command not found`).

Red run, pre-fix code (`node --test '.cortex/.tests/catalyst/lib/*.test.mjs'`): **123 pass / 2 fail**. Both new tests fail with `actual: undefined` for `run.launch_error` — the detail is not captured. The tests fail for the right reason.

Green run, post-fix code: **125 pass / 0 fail**. The two new tests pass, and the previously-passing `an errored judge run still writes the log` test was updated to assert the new detailed marker (`(judge launch failed: exit 1)` plus the stderr text) since it pinned the old bare marker.

Models: none — deterministic unit suite, no LLM involved. No Mode A replay owed: the fix landed in runner tool code, not an instruction file, and the deterministic lib suite covers the rule.

## What stays open

- The two evidence runs (21-19-02, 21-24-34) predate the fix and carry no `launch_error`; they stay as-is in history (history is kept in full). The undiagnosable root cause of those specific judge launch failures — most plausibly the opus-tier 401 on a wrong harness, per `project-opus-tier-test-actor-credits-error` — is not recoverable from their records; that is exactly the gap this repair closes for future runs.
- The memory entry `project-selftest-runner-no-stderr-on-failure.md` (which recorded this gap as known and unfixed) is decayed and pruned in this same dispatch, since the gap is now repaired and the incident record supersedes it.

## Related

- `2026-08-04-runner-closes-in-flight-agent.md` — the other runner-tool defect, same suite and lib, different gate (tab close, not record detail).
- `.cortex/.tests/catalyst/lib/dispatch.mjs` comment on the per-model harness ("claude-opus-4-8 launched as an omp agent dies on a provider 401") and memory `project-opus-tier-test-actor-credits-error.md` — the suspected actual cause of the two failed judge launches, which the new `launch_error` field will confirm or refute on the next occurrence.

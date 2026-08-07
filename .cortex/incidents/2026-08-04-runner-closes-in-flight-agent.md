# Test runner closes an in-flight actor tab on wait timeout

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-04
**Store:** kit-level (runner tool code + guard test).
**Owning file:** `.cortex/.tests/catalyst/lib/dispatch.mjs` (`makeRealInvoker` / `captureAgentOutput` / `closeAgentTab`).
**Recurrence of:** `2026-08-04-live-agent-closed-on-settled-read.md` (same family: a close without retirement proof, this time in the runner tool path).

## Answer first

The user report "some subagents constantly close in-flight agents. is that expected?" has two parts. The constant closes are mostly expected: every self-test run closes its own actor and judge tabs after they settle, and several meta-agents were running the suite in parallel (three runner processes live at 22:08-22:09, re-runs at 22:13), so tabs close continuously. The not-expected part: the runner closes the actor tab even when the agent never settled. On 2026-08-04 at 22:11:10, runner pid 83757 (`runner.mjs run dispatch-skill-mandate`) closed actor `dispatch-skill-mandate-actor` after its 15-minute wait expired, while the actor was still working: its brief (scenario.md) told it to monitor the in-flight worker of the current wave and block until settlement, its pane showed a blocking settlement loop with a usage gauge at 99.14%, and it had delivered no final reply. The close is unconditional in a `finally` after a settle wait whose exit code is never checked; `herdr agent wait` matches idle/done/blocked, so a long-running actor times out and gets killed. The run was then recorded as a normal failing run (2 failed criteria from the truncated capture) with `errored: false`, hiding the in-flight close.

## What the user wanted

Closing an in-flight agent is forbidden by the teardown gate (multiplexer-agent-ops): a tab may close only after a declared content-bearing hand-back or an exited/gone session. A settled-looking idle read is ambiguous. Live work requires explicit user approval. Test runners may close their own settled actor or judge tabs after their gates; that is separate from a meta-agent closing a live worker.

## What went wrong

1. Task 2's meta-agent (session pid 76931) launched `runner.mjs run dispatch-skill-mandate` at 21:56:10 to verify the dispatch-skill-mandate guard test. The runner dispatched actor `dispatch-skill-mandate-actor` (tab launched 21:56:11) whose brief told it to monitor the current wave's in-flight worker (impl-mandate-replay-0804), deliver a hand-back when it settles, and retire.
2. The actor did exactly that: it loaded the mandate and skills, then armed a wait on the in-flight worker (`Launch wait: impl-wait for exit`, pid 85635) and blocked in a foreground settlement loop, re-arming on each "Wait timed out." The runner's own `herdr agent wait dispatch-skill-mandate-actor --timeout 900000` (pid 84281) was still running at 14:27 elapsed when observed at 22:10:41.
3. At ~22:11:10 the wait hit the 900000 ms cap. `captureAgentOutput` does not check the wait's exit status; `makeRealInvoker` closes the tab in a `finally` regardless. The actor tab was closed (`herdr agent read` then returned `agent_not_found`) while the actor was mid-task with no hand-back. The actor's wait process died with the tab.
4. The runner then launched the judge on the truncated capture (the mandate quote and skill loads, but no deliverable), recorded run `2026-08-04T21-56-10` with `duration_ms: 960163`, `errored: false`, two failed criteria, and exited non-zero (per the just-landed FAIL rule). The re-run at 22:13 launched a fresh actor through the same un-gated close path; the same premature close will repeat at its 15-minute cap if the actor does not settle.
5. The observed "constantly" in the user report: the suite runs repeatedly (three parallel runner processes at 22:08-22:09 from meta-agents meta-steer-delivery-0804, meta-history-surface-0804, and the Task 2 meta; re-runs after failures), each run closing actor and judge tabs. Those closes are sanctioned when the agent settled; the 22:11:10 close was not.

## Root cause

Tool gap at the runner's close decision, in code:

1. `closeAgentTab` runs in a `finally` in `makeRealInvoker`, so it fires on wait timeout, wait error, and read error, not only on settlement.
2. `captureAgentOutput` ignores the `herdr agent wait` exit status entirely. The wait matches idle/done/blocked (per `herdr agent wait --help`: "Without --until, matches idle, done, or blocked"), so an actor that stays working past the window is indistinguishable from a settled one at the close decision.
3. The teardown gate in `catalyst-v2-multiplexer-agent-ops` (fixed earlier today for the orchestrator path) never reached the runner tool: no instruction file told the runner to close, and no code enforced the gate. The runner's own comment states the intent ("Close the agent's tab so the deterministic names are free on a re-run") without a settlement condition.
4. The in-flight close is invisible in the run record: the run is recorded `errored: false` with the partial transcript, so nothing flags that the actor was terminated mid-task.

The close is fresh-agent-repeatable: any runner invocation whose actor works longer than `CATALYST_AGENT_WAIT_MS` (default 900000) repeats it. Scenarios that legitimately run long (a monitor actor waiting on an external worker, a slow model, a usage-limit park) hit the cap.

## Fix

`.cortex/.tests/catalyst/lib/dispatch.mjs`, one edit:

- `captureAgentOutput` now returns `{ captured, settled, gone }`: `settled` is the wait's exit status; `gone` is wait failure plus an `agent read` failure with `agent_not_found` (the tab is dead).
- `makeRealInvoker` closes the tab only when `settled || gone` (the gate: finished, or exited/gone). On wait timeout with the agent still live, it returns `code: 1` with the reason in stderr, leaves the tab open, and the runner records an errored run. The caller owns the still-live tab, exactly like the c2d launch contract ("the tool never kills work; teardown is the caller's").

No instruction-file change: the teardown gate already forbids this close; the tool now honors it. The two required guard cases are the negative case (in-flight worker: wait times out, tab NOT closed) and the positive case (settled actor tab: wait settles, tab closed).

## Verification

Guard test `.cortex/.tests/catalyst/lib/close-guard.test.mjs`, deterministic unit test with fake `c2d`/`herdr` binaries (no live agents, fake binaries as ESM scripts with a close-log seam), written before the fix. Three cases: negative (in-flight worker: wait times out, agent still live, tab NOT closed, run errors), positive (settled actor tab: capture returned, tab closed), edge (agent gone: dead tab closed, run errors).

- Red run, pre-fix code: 1 pass / 2 fail. The negative case fails exactly as the incident predicts: the current code closes the tab on a timed-out wait (close log holds `t-42` where the test asserts it stays empty), and the gone case returns a success-shaped empty capture. The positive case passes on the pre-fix code too, proving the test separates sanctioned cleanup from the in-flight close.
- Green run, post-fix code: 3/3 pass. Negative: `code 1`, stderr names the settle failure, no close recorded. Positive: `code 0`, captured output returned, tab closed. Edge: `code 1`, dead tab closed.
- Full unit suite `.cortex/.tests/catalyst` after the fix: 103/103 pass. Dispatch tool suite (`settings/skills/catalyst-v2-dispatch`): 145/145 pass.
- Models: none (deterministic suite, no LLM involved).
- No Mode A replay owed: the fix landed in runner tool code, not an instruction file; the existing guard test `tab-close-requires-retirement` covers the instruction-level rule.

## What stays open

- The dispatch-skill-mandate re-run launched at 22:13 (runner pid 143263) uses the pre-fix code already loaded; if its actor does not settle before the 15-minute cap, that tab will still be closed in-flight. The fix applies to runs started after the edit.
- The dispatch-skill-mandate test's `single-mandate` and `fixture-exact` criteria fail on the live run: the delivered prompt carries a tool-injected CATALYST MANDATE copy in caller_owned mode (1591 vs 1321 chars). That is Task 2's own repair target (deliver.mjs), unrelated to the close gate; the Task 2 wave owns it.
- The scenario that exposed this (actor monitors a real in-flight worker and blocks until settlement) is Task 2's WIP test design; with the gate fix, a long-running actor is no longer killed, but its run still errors at the wait cap, so such scenarios should keep actor work inside the wait window or raise the cap.
- All other live agents accounted for at hand-back; nothing else was closed by this dispatch.

## Related

- `2026-08-04-live-agent-closed-on-settled-read.md`: the orchestrator variant, same family; the Teardown gate it landed covers the instruction level, not the runner tool.
- `2026-08-01-tabs-closed-without-settlement-verification.md`: the original family report.
- `2026-08-02-c2d-harness-temp-dir-leak.md` and `2026-08-02-full-lifecycle-wave-tabs-not-closed.md`: the settled-tabs-left-open mirror.

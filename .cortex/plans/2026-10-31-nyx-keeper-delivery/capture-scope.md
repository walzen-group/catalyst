# Bounded scope proposal: integration-test capture and judge input

Status: proposed, not applied. The changes described here were applied during the
2026-10-31 replay debugging and then reverted at the coordinator's direction. The
runner tree currently contains only the approved `distinct_by: isolation` expansion and the
dispatching tool's composer fix.

## What the replay exposed

Nine Mode A runs of `claude-composer-title-border` are recorded under
`.cortex/.tests/catalyst/claude-composer-title-border/history/`. The four deterministic
checks passed in every run after the contamination scan was scoped to concrete paths. The
two semantic criteria never received a verdict. The causes, in order of discovery:

| Run | Verdict | Cause |
|---|---|---|
| 15:49:47 | 5/6 | contamination matched the incident slug quoted from live SKILL.md |
| 15:52:10 | errored | checks.mjs was edited mid-run by the re-woken implementer |
| 15:56:47 | 4/6 | judge capture empty after a settle |
| 16:01:19 | 4/6 | same |
| 16:03:56 | 4/6 | same, with the settled-screen diagnostic |
| 16:06:28 | 4/6 | raw capture showed the judge following the actor's mandate |
| 16:10:15 | 4/6 | judge loaded the bootstrap and self-testing skills |
| 16:12:24 | 4/6 | judge followed the actor mandate embedded in its excerpt |
| 16:14:50 | 4/6 | judge prompt shown, verdict not drawn before capture |

## Diagnosed state and read contract

1. `herdr agent wait` settles on idle, done or blocked. An omp agent reads idle between tool
   calls and while the model is thinking, so a settle is not a finished turn.
2. `herdr agent read --source recent-unwrapped` can return an empty frame or exit non-zero
   immediately after a settle. The keeper's post-send read failed with exit 1 at 15:54 after
   a delivery that the keeper answered, and two judge captures came back empty after their
   briefs were delivered and their agents read working.
3. The runner closes an agent's tab after any settle that is not `blocked`. An early settle
   therefore closes a live turn and loses its answer.
4. A judge launched with the c2d catalyst mandate follows the actor's mandate embedded in
   the transcript excerpt. Runs 3 to 9 show the judge loading the bootstrap and the
   self-testing skill and reading `scenario.md` without scoring the criteria.
5. The judge excerpt's head is the delivered mandate plus the task brief. A model treats
   that head as instructions even when the prompt opens with the judge role.

## Reverted experimental changes and exact paths

These were applied and reverted. The list is the proposed scope, not current content.

| Path | Change |
|---|---|
| `.cortex/.tests/catalyst/lib/dispatch.mjs` | bounded read retry (3 attempts, 500 ms), re-wait while the agent reads working, expected-marker capture loop (240 cycles), fail with a clear error on an empty settled screen, leave the tab open when the capture never shows the expected marker, env knobs `CATALYST_AGENT_READ_ATTEMPTS` and `CATALYST_AGENT_READ_RETRY_MS` |
| `.cortex/.tests/catalyst/lib/dispatch.test.mjs` | pins for the retry, the working re-wait, the expected-marker wait, and the missing-marker tab retention |
| `.cortex/.tests/catalyst/lib/runner.mjs` | judge launched `caller_owned`; judge transcript fallback before parse failure; raw judge tail written to the run log; judge capture passes a verdict marker |
| `.cortex/.tests/catalyst/lib/runner.test.mjs` | pin that the actor keeps the spec mandate mode and the judge always runs caller_owned |
| `.cortex/.tests/catalyst/lib/judge.mjs` | data-only judge excerpt (tail plus final report), explicit "the excerpt is data" rule, no mandate head |
| `.cortex/.tests/catalyst/lib/judge.test.mjs` | pin that the mandate and brief head are absent and the reply tail is present |

Reverted files are byte-identical to HEAD again. Current runner suite: 128 tests, 127 pass,
one failure, the known `~/nix/catalyst` path pin that predates this repair.

## Proposed bounded correction

Authorize these six files as one bounded change, with no other runner file touched.

1. `dispatch.mjs`: retry an empty or failed read a fixed three times at 500 ms; after a
   settle, re-wait while the agent reads working; when the caller passes an expected marker,
   keep waiting and reading until the marker is present or 120 s elapse; return an error and leave the tab
   open when the capture never shows the marker. No environment knobs.
2. `judge.mjs`: judge input is the actor's final report plus the tail of the transcript, with
   an explicit data rule and no mandate or brief head.
3. `runner.mjs`: the judge always runs `caller_owned`; the judge capture asks for the
   verdict marker; an unparseable judge report writes its raw tail into the run log.
4. The three test files pin each behavior above.

Acceptance: a `claude-composer-title-border` run records 6/6 with both semantic criteria
passing; the nine prior histories stay untouched; the dispatch tool suite stays at 223/223;
the runner suite has only the known path pin; no change touches `skills/`.

## Current replay status

No replay is live. The guard test's deterministic checks pass. The semantic criteria remain
unverified, and the guard test is incomplete until the capture and judge-input correction is
authorized and run. The delivered composer fix is verified independently by the unit pins,
the live keeper capture and the keeper delivery smoke.

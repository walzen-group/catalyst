# Steer-failure claude session killed by runner teardown

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-04
**Store:** kit-level (runner tool code + guard tests in the c2d and runner suites).
**Owning files:** `.cortex/.tests/catalyst/lib/dispatch.mjs` (`makeRealInvoker` blocked-settle gate), `.cortex/.tests/catalyst/lib/close-guard.test.mjs` (blocked-settle case), `settings/skills/catalyst-v2-dispatch/test/steer.test.mjs` (steer-failure preserves target pin).
**Related:** `2026-08-04-runner-closes-in-flight-agent.md` (the runner's in-flight close, same file, fixed at 22:20), `2026-08-04-steer-delivery-false-negative.md` (the steer failure this report started from), `2026-08-04-live-agent-closed-on-settled-read.md` (the close-without-retirement family).

## What the user wanted

The user reported "yeah no ok something is wrong, the steer failure claude session was just killed". A failed or ambiguous steer must leave the target session and tab alive: c2d reports the failure and preserves evidence, but terminates nothing. Recovery is a separate explicit decision owned by the orchestrator or the user.

## What went wrong

The steer-failure-session-proof test's claude judge (session 6138b90f-589d-458c-b702-3d1db3ea8658, tab w1:t1D, claude-opus-4-8) was terminated at 22:10:56, minutes after the steer-delivery-false-negative investigation, and the user saw it die. A second claude judge (dispatch-skill-mandate, session f9058dc9-b380-4f71-a57e-d81fd0bd33ef, tab w1:t1E) was terminated at 22:12:10, and two further judges from re-runs after it. All were killed by the self-test runner's teardown, `herdr tab close` in the capture path, not by any steer command.

Verified state through herdr/c2d: both tabs are closed (absent from the tab list, where dead-shell tabs such as w1:t2 remain), `herdr agent get` returns agent_not_found, and no claude process is alive.

## Root cause

Two parts, both verified in code:

1. The steer failure path is exonerated. `steer.mjs` and `deliver.mjs` touch only agent get/prompt/send-keys and screen reads; a failure is recorded in the failures ledger and returned in the result document. The failures ledger for the window holds steers to orchestrator (21:33 x3), meta-mandate-c2d-0804 (21:46), and meta-mandate-replay-0804 (22:06), none against a claude session. A steer failure cannot terminate its target; the user's connection was temporal.

2. The runner's teardown terminated the sessions. `makeRealInvoker` in `.cortex/.tests/catalyst/lib/dispatch.mjs` closed every launched agent's tab in a finally after `herdr agent wait` settled, with no completion proof. The premature variant (an in-flight omp actor closed on wait timeout at 22:11:10) is incident `2026-08-04-runner-closes-in-flight-agent`, repaired at 22:20 with a settled-or-gone gate. The repair left one ambiguous settle: `herdr agent wait` matches idle, done, and blocked, and a blocked agent is live on an approval or question UI. The settled-or-gone gate closes the tab on a blocked settle too, terminating a live session.

## Fix

`.cortex/.tests/catalyst/lib/dispatch.mjs`, one edit:

- The invoker reads the agent's status through `herdr agent get` after a settled wait. A blocked settle returns code 1 with the reason in stderr and leaves the tab open, mirroring the in-flight case; the run records errored and the caller owns the live tab. The close still fires on a clean settle (idle/done) and on a gone agent.

## Verification

Test-first, both guard cases written before the repair.

1. Runner blocked-settle case in `close-guard.test.mjs` (fake c2d/herdr binaries, no live agents): the wait settles but `agent get` reports blocked; the run must error and the close log must stay empty.
   - Red run, pre-repair code: 3 pass / 1 fail; the blocked case fails because the settled-or-gone gate closes the tab.
   - Green run, post-repair code: 4/4 pass.
   - Full runner lib suite after the repair: 104/104 pass.
2. c2d steer pin in `test/steer.test.mjs`: a steer whose prompt stalls fails honestly, and the recorded herdr argv contains no close, kill, stop, or restart verb on agent/tab/pane/workspace, exactly one prompt attempt, and no keystrokes.
   - Runs green against the current code: the pin records the exoneration as a regression guard against a future steer path adding a termination call.
   - Full dispatch tool suite: 144/144 pass.

Models: none; both suites are deterministic. No Mode A replay owed: the repair landed in tool code, not an instruction file.

## What stays open

- The blocked-settle gate depends on `herdr agent get` answering right after the wait settles; an unreadable get reads as not blocked and the close proceeds. The read is best-effort by design: a dead tab close is harmless, and a live non-blocked agent is a clean settle.
- The runner still treats a clean settle as the end of the agent's work. A judge that completes its verdict then parks idle reads as settled and its tab is closed; that is the sanctioned teardown this incident verified as the actual kill sequence.

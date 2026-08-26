# A bounded wait keyed to a ceiling idled for 55 minutes on completed work

**Status:** filed; repair landed in this same dispatch (2026-08-26): three skill
edits, the guarding test extended, red and green recorded, live Mode A replay
(result under Verification). Revises the fix in
`2026-08-26-meta-orchestrator-wait-churn`, filed one hour earlier; that
incident's Fix section carries a revision note pointing here.
**Filed:** 2026-08-26
**Store:** kit-level (catalyst system failure).
**Owning files:** `catalyst-v2-running-a-meta-agent/SKILL.md` (monitoring loop,
two edits), `catalyst-v2-multiplexer-agent-ops/SKILL.md` (wake discipline, three
edits), `catalyst-v2-planning-artifacts/SKILL.md` (worker brief hand-back
recipient, one edit).
**Design record:** `.cortex/reports/2026-08-26-wake-subsystem-design.md` holds
the options considered and the chosen design in full; this incident is the audit
record of the defect and its repair.

## Answer first

The remedy that landed one hour earlier told a churning meta to "hold on one
bounded background wait keyed to material events (a worker's a2a hand-back, a
roster or status change, a timeout ceiling)." Listing a timeout ceiling as a
keying event makes the hold a timer, and a timer does not know the work
finished. A monitor followed it: it armed a 60-minute hold, the worker finished
at 5 minutes, and the monitor sat idle for 55 minutes on completed work. The
user named it directly: "60m wait, task was done after 5 mihn, 55 min wasted."

The repair strikes the timer framing and settles the subsystem on three rules: a
wait return names an event, not a state, so every return is a cue to read the
agent (content on a settle to tell done from parked, usage on a timeout to tell
working from quota-dead); the settle wait is settle-bound with its ceiling as a
bound, never a duration to sleep out; and the worker's hand-back push, addressed
to the monitoring meta, is the primary completion wake that fires at real
completion, with the settle wait demoted to a safety net.

## What the user wanted

The user asked for a way forward on the whole wait/sleep subsystem. Their words:

> launch another meta wave for the whole wait-sleep incident, and have the meta
> agent figure out a good way forward. agents shouldnt foreground block all the
> time because they need to be ready for user input. i dont mind if its achieved
> another way. even background sleeps CAN be okay if meta deems it necessary,
> but i just dont want agents idle waiting for an hour for something that has
> already been completed.

And two mid-flight corrections that sharpened the target. On the central defect:

> tht is nto what i meant. i meant the opposite, 60m wait, task was done after 5
> mihn, 55 min wasted

And striking a phantom failure mode from the inputs:

> your video scan waits timed out because the subagents ran out of quota btw

So: no foreground blocking; the mechanism is open; a background wait is fine when
the monitor judges it necessary; and no agent idles on work that already
finished. The wasted wall-clock on early completion is the defect to fix, not a
timeout that fires late.

## What went wrong

A monitor armed a bounded background wait sized to a 60-minute ceiling on a
worker. The worker finished about 5 minutes in. The wait was not bound to the
worker's completion, so it held to its ceiling, and the monitor sat idle for the
remaining 55 minutes on work that was already done.

The subsystem behind it conflates states it cannot see. The one wait primitive,
a backgrounded `herdr agent wait <name> --timeout <ms>`, returns on a settle or a
timeout, and neither event identifies the agent's state:

- A settle fires on idle, done, exited, or settled, so it cannot tell
  task-complete from an omp agent parked between its own turns (the over-firing
  churn of `2026-08-24-wake-churn-on-parked-meta` and
  `2026-08-26-meta-orchestrator-wait-churn`).
- A timeout fires when nothing settled within the ceiling, so it cannot tell a
  genuinely working agent from one parked dead on its quota. Two agents in the
  reporting session died on this axis: one meta burned its five-hour budget in a
  re-arm loop, one worker hit the quota wall.

The prior fix, one hour old, was aimed at the settle-side churn. Its remedy told
the meta to stop the tight re-arm loop and "hold on one bounded background wait
keyed to material events (..., a timeout ceiling)." That traded the churn for the
timer hold: a hold whose named wake is its ceiling idles to that ceiling
whenever the work finishes first.

## The mechanical question, answered from code

A settle-based wait should return the instant its agent goes idle, which would
make the 5-minute case return at 5 minutes. So either the wait was not
settle-based, or settle detection failed. The tool source answers it. In
`catalyst-v2-dispatch/src/wake.mjs` the settle set is idle, done, exited,
settled, and a wait returns at once (about 5ms) against an already-settled agent.
A settle-bound `herdr agent wait <worker>` armed on the worker that finished at 5
minutes would have returned at 5 minutes. The 55 minutes could only come from a
hold not bound to that worker's settle: a timer to the ceiling. Settle detection
is sound for the done case. The fix is to stop using timer holds, not to repair
detection.

## Recurrence scan

Read in full before filing:

- `2026-08-26-meta-orchestrator-wait-churn` (one hour earlier): the fix this one
  revises. Its remedy for the settle-side churn introduced the timer-hold
  framing. This is that fix not taking cleanly: it removed one waste and seeded
  another, so its weak edit is the root cause of the facet repaired here.
- `2026-08-24-wake-churn-on-parked-meta`: the settle-side over-firing on parked
  agents. Still true and untouched; the read-content-on-settle rule is its
  companion.
- `2026-08-09-foreground-blocking-wait` and
  `2026-08-11-foreground-wait-guard-session-coverage`: the foreground ban and its
  guard. Untouched; every wait here stays backgrounded.
- `2026-08-01-dispatch-wake-armed-nothing-delivers` and
  `2026-08-04-orchestrator-self-wait`: the caller-arms-every-wake rule and the
  self-wait shape. The push-primary rule builds on the first (a push is delivered
  by the worker's harness; the settle wait stays the meta's own safety net) and
  leaves the second intact.

## Root cause

Three instruction gaps across the wake subsystem, all reachable by a monitor
reading its own skills.

1. **The timer framing.** Both the meta skill (monitoring loop) and the
   multiplexer skill (wake discipline) listed a timeout ceiling as a material
   event a quiet hold is keyed to. A ceiling is a bound, not an event, and a hold
   whose wake is its ceiling is a timer that idles on completed work.

2. **No rule that a wait return is a cue to read.** The skills treated a settle
   as done and left a timeout unexamined. Neither event names a state: a settle
   conflates done with parked, a timeout conflates working with quota-dead. With
   no instruction to read the agent (content on a settle, usage on a timeout), a
   monitor acted on the outcome alone.

3. **No home for the worker-to-meta push.** The meta skill assumed "your workers
   hand back over a2a, that push wakes you," and the orchestrating-delegates skill
   already runs "the hand-back arrives via steer; the wake is a safety net" for
   the meta-to-orchestrator hop. But no brief-authoring rule told worker specs to
   address the push to the meta, so the field addressed it to the orchestrator and
   the meta was starved of its primary wake, left to depend on the flaky settle.

## Fix

Landed in this dispatch, one dispatch with the incident.

1. **catalyst-v2-multiplexer-agent-ops, "Consecutive instant settles" bullet.**
   The switch-to-a-background-watch text is keyed to material events (a hand-back
   push arriving, a roster or status change); a timeout ceiling is named as a
   bound on the wait, the longest the watch stays blind before a heartbeat check,
   never a duration to sleep out.

2. **catalyst-v2-multiplexer-agent-ops, new "A wait return names an event, not a
   state" bullet.** A settle and a timeout each name an event, not a state; read
   the agent before acting (content on a settle to tell done from parked, usage
   gauges on a timeout to tell working from a quota park); the return is a cue to
   read, never a conclusion.

3. **catalyst-v2-multiplexer-agent-ops, "Banned wait shapes".** The sanctioned
   quiet wait is settle-bound: it returns the instant the agent settles, so an
   agent done at 5 minutes wakes the monitor at 5 minutes; the ceiling is a bound,
   never a duration to sleep out; a hold that sits to its ceiling while the work
   already finished is wasted wall-clock. The shell-sleep ban and the
   foreground-wait ban are untouched.

4. **catalyst-v2-running-a-meta-agent, new paragraph after the watcher rule.** A
   worker's hand-back push is the meta's primary wake and the settle wait is the
   safety net; every worker is briefed to address its completion hand-back to the
   meta, which verifies and hands to the orchestrator; the push fires at real
   completion, and the settle wait underneath keeps an ended turn from being
   wakeless.

5. **catalyst-v2-running-a-meta-agent, "On track" bullet.** The quiet hold is one
   bounded background wait, settle-bound to the worker; the ceiling is a bound,
   never a duration to sleep out, and a hold that sits to its ceiling on finished
   work is wasted wall-clock; a wait return names an event, not a state, so read
   content on a settle and usage on a timeout, and handle a quota park as a park
   (re-arm long to the reset, never a longer blind ceiling).

6. **catalyst-v2-planning-artifacts, new spec-authoring bullet.** A worker's
   completion hand-back is addressed to the monitoring meta (a2a push), not the
   orchestrator, so the push lands on the watcher holding the wait.

No `feedback-*` memory note: the lesson's durable home is the skill text landing
in this dispatch, and the Curator prunes memory that restates a skill. The user's
verbatim words are preserved above.

## Verification

Test-first order per catalyst-v2-sdd-rules, then the live Mode A replay per the
filing skill's table (an instruction-file fix owes a Mode A intent simulation).

Guarding test: suite scan found `meta-orchestrator-wait-churn` guarding this same
churn brake in the same owning files. Extended rather than duplicated, per the
scan-first rule: the revised rule lives in the same files and role, so the test
gained three deterministic pins, two semantic criteria
(early-completion-no-timer-hold, timeout-read-working-vs-quota), a third covered
file (catalyst-v2-planning-artifacts), and the early-completion and quota-dead
facets in its scenario. The dropped pin "hold on one bounded background wait"
named the timer-hold framing this incident removes.

- **RED (pre-revision skill text):** `red-run.txt`, deterministic check
  `skill-meta-scope-and-churn-present` fails with the six new pins missing (the
  three retained pins still present); no-contamination clean.
- **GREEN (post-fix):** `green-run.txt`, all 10 pins present (6 meta, 3
  multiplexer, 1 planning-artifacts).
- **Live Mode A intent simulation, the test's first recorded run:** suite runner
  live run `history/2026-08-26T08-10-13`, 7/7 pass, 0 regressions, 71s. Actor: a
  fresh meta-agent launched through c2d into the test's own directory, omp,
  opencode-go/deepseek-v4-flash (declared), the model that ran the original churn
  loop. Judge: claude-opus-4-8, distinct from the actor. Pass criteria were fixed
  in test.yaml before the run. Reading only the live repaired skills, the actor
  arms no wait on the orchestrator; checks impl-b first, then holds one
  settle-bound backgrounded wait as a safety net with the a2a hand-back push as
  the primary wake, no tight re-arm loop; names the 55 idle minutes as the
  ceiling slept out as a duration and the hand-back push at 5 minutes as the real
  wake, with the ceiling a bound not a timer; treats impl-c's ceiling timeout as
  a cue to read usage, re-arming a working agent and re-arming a quota park long
  to its reset rather than restarting or blind-holding; and refuses a shell sleep
  as mechanically blocked while keeping `herdr agent wait` the wake primitive.
  Isolation held: no forbidden source, no .cortex read, no git, no write. Two
  earlier runs from the prior incident (07-29-52, 07-32-33) stay in history.
- **Sibling test kept green, not stale.** The multiplexer edit preserves the
  `wake-churn-on-parked-meta` rule and its pinned phrase "bounded background
  polling watch": that 2026-08-24 poll escape hatch stays a per-occurrence option
  this design demotes but does not remove. Its deterministic checks pass 5/5
  against the edited skills, so no superseded rule sits green on a stale pin. An
  interim edit had dropped the phrase; it was restored before final
  verification, and the phrase does not appear in any meta-orchestrator-wait-churn
  criterion, so the live Mode A run above is unaffected.

## What stays open

Two items for the user, neither a blocker.

1. **A literal shell sleep.** The design needs no shell sleep in the normal path:
   the push wakes at real completion and the settle wait is event-bound. One
   residual case wants a real background timer, an all-parked-quiet wave where the
   push has failed and every settle wait instant-returns, so a spaced re-check has
   nothing to bind to. Spacing it needs a background sleep, which the sleep-guard
   extension refuses. If the user permits a bounded background sleep, that is the
   clean spacer for this one case; until then the monitor relies on the push plus
   the settle net and holds no blind timer. This is the pending shell-sleep
   decision from `2026-08-26-meta-orchestrator-wait-churn`, unchanged.

2. **c2d status counts a live wait regardless of owner.** In `wake.mjs` the
   liveWaitFor scan discards orphaned waits but does not attribute a live wait to
   its owner, so a wave can read healthy while the reader owns none of the waits.
   Under the chosen design only the monitoring meta waits on a worker, so the
   misread does not arise in a clean wave, but an owner-attribution field on the
   status wake block would make it impossible even under role confusion. That is
   tool code, a separate fix-in-progress for an implementing wave, whose
   meta-agent runs the gates; the design report names it for the user to schedule.

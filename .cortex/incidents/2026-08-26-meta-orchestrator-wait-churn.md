# A meta-agent armed a churning settle wait on the orchestrator

**Status:** filed; repair landed in this same dispatch (2026-08-26): two skill
edits plus a reconciling edit, guarding test authored, red and green runs
recorded, live Mode A replay 5/5. Nothing report-only remains.
**Filed:** 2026-08-26
**Store:** kit-level (catalyst system failure); names the project damage
(statswatch shared-contested-detection wave 2 below).
**Owning files:** `catalyst-v2-running-a-meta-agent/SKILL.md` (the meta's wake
scope and its monitoring-loop churn brake, two inserts) and
`catalyst-v2-multiplexer-agent-ops/SKILL.md` ("Banned wait shapes", the
shell-sleep ban reconciled with a quiet background wait).

## Answer first

meta-wave2-contested, a meta-agent monitoring wave 2 of the statswatch
shared-contested-detection effort (dispatch 2026-08-25-shared-contested-w2,
omp, opencode-go/deepseek-v4-flash at thinking max), armed
`herdr agent wait orchestrator --timeout 900000`: a settle wait on the
orchestrator, which is its watcher and dispatcher, not one of the three workers
it monitored. The orchestrator session is the user's own live pane, so the wait
returned in under a second every time, and the meta re-armed the identical wait
50-plus times at roughly 400ms per cycle. It exhausted its 5-hour provider
budget (429 GoUsageLimitError, $5.20, 3h22m session) and stopped
mid-verification, leaving wave 2's verification unfinished. meta-wave1-contested,
the prior wave's meta on the same model, ran the same loop.

Two gaps sit behind this, both in the meta-agent's own skill, which is the file
the previous churn incident (2026-08-24) deliberately left unedited. First, no
rule told the meta that the orchestrator is its watcher rather than a monitored
agent, so it armed a wait on the orchestrator the way it arms one on a worker.
Second, the instant-settle churn brake filed one day earlier lived only in
catalyst-v2-multiplexer-agent-ops, and the meta follows
catalyst-v2-running-a-meta-agent, whose monitoring loop said only "On track:
re-arm". A meta reading its own skill reached "re-arm" with no brake in sight.

## What the user wanted

User words, verbatim. The trigger:

> also you need to file an incident with catalyst, the meta agent did this:
> [pasted pane content showing repeated `herdr agent wait orchestrator
> --timeout 900000` re-arm cycles] and burnt a lot of tokens.

And the policy the user stated for the fix:

> if a wait completes instantly, it must check with the agents it monitors
> immediately. if they are not stuck, a background sleep should be allowed.
> since implementers do an a2a handback the agent should be woken anyway. but
> we need to prevent infinite wake arms

So: on an instant settle, check the monitored agents first; once they read
healthy, hold a quiet background wait rather than churning, since the workers'
a2a hand-back wakes the meta regardless; and stop the infinite re-arm.

## What went wrong

Over one 3h22m session, meta-wave2-contested ran the same cycle continuously:

- It armed four backgrounded waits. Three were legitimate worker waits
  (impl-task3-hybrid-control, impl-task4-control, impl-task5-escort, each
  `--timeout 2400000`). The fourth was `herdr agent wait orchestrator
  --timeout 900000`, a wait on its own dispatcher.
- The orchestrator wait settled in under a second, since the orchestrator pane
  is a live session working its own turns.
- The meta re-armed the identical wait at once, learning nothing, 50-plus times
  at roughly 350 to 520ms per cycle, the background job ids cycling and
  wrapping.
- The session reached its 5-hour provider limit (429 GoUsageLimitError,
  provider-requested 7259000ms wait exceeding retry.maxDelayMs) and stopped
  mid-verification. c2d status read it blocked.

Project damage: wave 2 of the statswatch shared-contested-detection effort lost
its meta mid-verification, so that wave's verification went unfinished. In the
same window, three orchestrator-owned worker wakes died with exit code 144 at
the moment the meta armed its own waits on the same three agents; the
orchestrator read c2d status as healthy (it counts any live non-orphaned wait
regardless of owner) and did not re-arm them. Whether the meta's waits displaced
the orchestrator's is unverified and stands as an observation.

## Recurrence scan

This failure is a recurrence on one axis and a sibling on another. Both prior
incidents were read in full before filing.

**Recurrence of 2026-08-24-wake-churn-on-parked-meta (the churn amplifier).**
That incident, filed one day earlier, fixed the same mechanical shape: a
settle-based wait on an agent parked between turns returns instantly, and the
watcher re-arms blind, burning tokens for no signal. Its fix inserted the
"Consecutive instant settles carry no signal" bullet into
catalyst-v2-multiplexer-agent-ops and authored the wake-churn-on-parked-meta
guarding test, Mode A 5/5. It recorded a deliberate decision not to edit
catalyst-v2-running-a-meta-agent, reasoning that the meta skill already defers
wake mechanics to the multiplexer skill and a second copy would drift. A
meta-agent ran the churn the next day. Per the filing rule, the earlier fix not
taking is the root cause of this facet: the single-home decision left the
meta-agent role, which follows its own skill's "On track: re-arm", without a
brake it would actually read. The evidence that the difference in who churned
(2026-08-24: the orchestrator watching a meta; today: a meta watching the
orchestrator) is a distinction of instance rather than of mechanism is the
identical cycle shape, model, and token-burn signature across both.

**Sibling of 2026-08-04-orchestrator-self-wait (the arming).** That incident
fixed the caller arming a wait on its own roster entry: c2d status marks the
caller `caller_self: true` and prescribes no wait on it, and the skills gained
"Never arm a wait on your own name". Today a different agent, the meta, armed a
wait on the orchestrator. The caller_self guard cannot catch it: the meta's own
entry is meta-wave2-contested, so the orchestrator is not its caller_self, and
nothing flagged the wait. The failing shape is the same (a settle wait on the
orchestrator's live pane, instant return, waking nobody), reached from the other
side. The 2026-08-04 fix stated the watcher-not-target principle only for the
caller's own case; it never said no agent waits on the orchestrator. This is the
gap that let a meta reach the same shape.

`2026-08-01-orchestrator-used-sleep` and `2026-08-04-meta-housekeeping-sleep-conduct`
were also read, for the sleep reconciliation below rather than for recurrence:
they ban a foreground shell sleep and drove the sleep-guard extension.

## Root cause

Two instruction gaps, both owned by `catalyst-v2-running-a-meta-agent`, with a
prose reconciliation owed in `catalyst-v2-multiplexer-agent-ops`.

1. **The arming.** The meta skill told the meta to arm waits on the agents it
   monitors but never named the orchestrator as outside that set. The
   orchestrator is the meta's watcher and dispatcher: the meta reaches it by
   push (c2d steer, c2d handback) and it wakes on that push. A meta with no rule
   distinguishing its dispatcher from its workers armed a wait on the
   orchestrator like any other, and that wait settles instantly against a live
   pane and wakes nobody.

2. **The churn.** The instant-settle brake from 2026-08-24 lived only in
   catalyst-v2-multiplexer-agent-ops. The meta follows
   catalyst-v2-running-a-meta-agent, whose monitoring loop read "On track:
   re-arm" with no brake and no pointer to the churn rule at the point of
   decision. Deferral by a distant cross-reference was not enough: the role that
   churned reached "re-arm" as its only move.

The deeper theme joins both priors: wake-discipline rules written for the
orchestrator role (2026-08-04) or homed only in the multiplexer skill
(2026-08-24) did not bind the meta-agent role, and a meta hit both gaps at once.

The prose tension the user's policy exposes: catalyst-v2-multiplexer-agent-ops
said a shell sleep is never a wait, while the user sanctions a background sleep
once the monitored agents read healthy. The sleep-guard omp extension
mechanically refuses every shell `sleep` under herdr, so a literal shell sleep
cannot be the mechanism regardless. The reconciliation names the sanctioned
quiet-wait as a bounded backgrounded wait, which is a background sleep in the
operative sense (the session sleeps until a material event or a ceiling wakes
it), while the foreground and shell-timer bans stay intact.

## Fix

Landed in this dispatch, one dispatch with the incident.

1. **catalyst-v2-running-a-meta-agent, the arming (new paragraph after "Your
   own entry is you").** States that the orchestrator is the meta's watcher, not
   a monitored agent: arm waits only on the workers you monitor, never on the
   orchestrator; reach it by push and it wakes on that push; a wait on its live
   session settles at once and wakes nobody, the 2026-08-04 self-wait shape
   reached from the other side, which the caller_self guard cannot mark for you;
   the workers' a2a hand-back wakes you when there is something to act on.

2. **catalyst-v2-running-a-meta-agent, the churn (extended "On track" bullet).**
   On an instant settle, check the monitored workers before re-arming; a wait
   that keeps settling instantly reads a worker parked between turns, not its
   progress (cross-referencing the multiplexer churn rule by name). Once the
   workers read healthy, stop re-arming in a tight loop and hold one bounded
   background wait keyed to material events (a worker's a2a hand-back, a roster
   or status change, a timeout ceiling), which is how you wait quietly in the
   background; the a2a hand-back wakes you when work lands. This carries all four
   parts of the user's policy: check the monitored agents first, hold a quiet
   background wait once they are healthy, rely on the a2a hand-back as the wake,
   and stop the infinite re-arm.

3. **catalyst-v2-multiplexer-agent-ops, the reconciliation ("Banned wait
   shapes").** Directly after the shell-sleep ban: the sanctioned way to wait
   quietly between checks is a bounded backgrounded wait, a backgrounded
   `herdr agent wait` to a timeout ceiling or the bounded background polling
   watch, held once the agents are checked healthy this turn; a literal shell
   `sleep` stays refused mechanically by the sleep-guard extension; the
   background wait is how you sleep between checks. The foreground blocking-wait
   ban that follows is untouched.

**Revised 2026-08-26 by `2026-08-26-wake-hold-idled-on-completed-work`.** Fix
items 2 and 3 above told a churning meta to "hold on one bounded background wait
keyed to material events (..., a timeout ceiling)." Listing a timeout ceiling as
a keying event makes the hold a timer, and a monitor that armed a 60-minute hold
on a worker that finished at 5 minutes idled 55 minutes on completed work, the
user's next complaint. The follow-on incident strikes the timer framing: the
quiet hold is settle-bound with its ceiling as a bound (never a duration to
sleep out); a wait return names an event, not a state, so the monitor reads the
agent (content on a settle, usage on a timeout); and the worker's hand-back
push, addressed to the monitoring meta, is the primary completion wake with the
settle wait as the safety net. Item 1 of this fix (the orchestrator is the
meta's watcher, never wait on it) stands unchanged. See that incident and
`.cortex/reports/2026-08-26-wake-subsystem-design.md`.

No `feedback-*` memory note, deliberately: the lesson's durable home is the
skill text landing in this dispatch, and the Curator prunes memory that restates
a skill. The user's verbatim words are preserved above.

## Verification

Test-first order per catalyst-v2-sdd-rules, then the live Mode A replay per the
filing skill's table (an instruction-file fix owes a Mode A intent simulation).

Guarding test: suite scan found wake-churn-on-parked-meta guarding the same
churn shape from the orchestrator role and the multiplexer skill, a distinct
rule (different role under test, different owning file, and no
no-orchestrator-wait facet). New directory
`.cortex/.tests/catalyst/meta-orchestrator-wait-churn/` guards the meta-agent's
wake scope and its own churn brake.

- **RED (pre-fix skill text):** `red-run.txt`, deterministic check
  `skill-meta-scope-and-churn-present` fails with all five pins missing (the
  four meta-skill phrases and the one multiplexer phrase the fix adds);
  no-contamination trivially clean.
- **GREEN (post-fix):** `green-run.txt`, all five pins present.
- **Live Mode A intent simulation, the test's first recorded run:** suite runner
  live run `history/2026-08-26T07-32-33`, 5/5 pass, 0 regressions. Actor: a
  fresh meta-agent launched through c2d into the test's own directory, omp,
  opencode-go/deepseek-v4-flash at thinking max, the meta-agent models.yaml row
  and the exact model that churned. Judge: claude-opus-4-8, distinct from the
  actor. Pass criteria were fixed in test.yaml before the run. Reading only the
  live repaired skills, the actor arms no wait on the orchestrator (naming it
  watcher and dispatcher, woken by the meta's push), checks impl-b first then
  replaces the blind re-arm with one bounded backgrounded wait keyed to the a2a
  hand-back, roster or status change, and a timeout ceiling, and refuses a shell
  sleep as mechanically blocked while keeping `herdr agent wait` the default.
  Isolation held: no .cortex read, no git, no launches, delivered in the reply.

  One process note on the run record: the first live run
  (`history/2026-08-26T07-29-52`) scored 4/5, failing only no-contamination
  because the actor cited the incident id, which the repaired meta skill now
  cross-references in its own text (as it already cites
  2026-08-04-orchestrator-self-wait) and which is also the actor's cwd directory
  name. That was a contamination-scan false positive: the id reached the actor
  through the live instructions and the test path, not the incident report, and
  the actor tripped no read-path, git, or write rule. checks.mjs was corrected to
  drop the incident id from the forbidden set (the dispatch id, the wave names,
  the project, and the worker names stay forbidden, none of which appear in any
  skill, so an actor that actually read the report would still be caught). The
  re-run scored 5/5. Both runs are kept in history.

## What stays open

One item for the user, not a blocker. The user's phrase was "a background sleep
should be allowed". A literal shell `sleep` is refused mechanically by the
sleep-guard omp extension under herdr, so the reconciliation gives the operative
capability (wait quietly in the background between checks, stop the churn)
through a bounded backgrounded wait rather than a shell timer. If the user
intends a literal shell sleep to be permitted for a healthy-workers heartbeat,
that is a change to the sleep-guard extension (product code), which would be a
separate fix-in-progress owned by an implementing wave's meta-agent, not this
instruction repair. The instruction text as landed keeps the shell-sleep ban and
the sleep-guard behavior unchanged.

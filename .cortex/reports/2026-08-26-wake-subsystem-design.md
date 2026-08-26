# A way forward for the wait/wake subsystem

**Author:** meta-wake-design (catalyst meta-agent), 2026-08-26
**Status:** design + implementation landed this dispatch. Continues and revises
`2026-08-26-meta-orchestrator-wait-churn` (filed one hour earlier); the revision
is stated plainly in "What this revises" below.
**Owning files touched:** `catalyst-v2-multiplexer-agent-ops/SKILL.md` (wake
discipline), `catalyst-v2-running-a-meta-agent/SKILL.md` (monitoring loop),
`catalyst-v2-planning-artifacts/SKILL.md` (worker brief hand-back recipient).
No tool code changed; one tool finding is left for the user (see Findings).

## Problem

The user looked at three incidents of wait/wake failure and asked for a way
forward on the whole subsystem, in their words: agents must stay responsive to
user input (no foreground blocking); the mechanism is open; a background sleep
is permissible when the monitoring agent judges it necessary; and no agent
should sit idle for an hour on work that already finished.

The sharpest of these, and the newest complaint, in the user's words: "60m
wait, task was done after 5 mihn, 55 min wasted." A long wait was armed, the
work completed early, and the waiting agent held to the ceiling anyway.

## One primitive, three states it cannot tell apart

Every wait in catalyst runs through one primitive: a backgrounded
`herdr agent wait <name> --timeout <ms>`. It returns on one of two events, a
settle or a timeout, and neither event identifies the agent's actual state.
From the tool source (catalyst-v2-dispatch/src/wake.mjs, measured live
2026-08-01): a settle fires when the agent reaches idle, done, exited, or
settled, and returns in about 5ms against an already-settled agent.

| Wait returns | What actually happened | The two states it conflates |
|---|---|---|
| Settle (fires early) | agent reached idle/done | task complete, OR parked between turns (omp reads idle mid-task) |
| Timeout (runs to ceiling) | no settle within the ceiling | genuinely working, OR quota-dead and parked (never going to settle) |

The three failure modes the user and the field reported are three faces of this
one conflation:

1. **Wasted wall-clock on early completion.** A hold sized to a 60-minute
   ceiling held for 55 minutes after the work finished at 5 minutes. This is the
   user's central complaint.
2. **Over-firing on parked agents.** An omp agent between turns reads idle, so a
   settle wait armed on it returns at once. A watcher that re-arms blind runs a
   tight loop that measures parking, not progress
   (`2026-08-24-wake-churn-on-parked-meta`,
   `2026-08-26-meta-orchestrator-wait-churn`).
3. **Blind holding on quota-dead agents.** A rate-limited agent looks identical
   to a working one: no settle, the wait runs to its ceiling. A monitor that
   cannot tell busy from dead keeps holding long waits on agents that will never
   settle. Two agents in the reporting session died this way (one meta burned
   its five-hour budget in a re-arm loop, one worker hit the quota wall).

### The corollary the correction forced, established from code

The orchestrator's first field note claimed the primitive "under-fires on long
real work." The user corrected it twice: those long timeouts were quota-parked
subagents, not busy ones, so that mode does not exist and is struck from the
inputs. That left the early-completion waste standing alone, and it points at a
mechanical question worth settling before designing: a settle-based wait should
return the instant its agent goes idle, which would make the 5-minute case
return at 5 minutes. So either the wait was not settle-based, or settle
detection failed.

The code answers it. The set of statuses a wait settles on is idle, done,
exited, settled, and a settle wait returns at once against a settled agent. A
settle-bound `herdr agent wait <worker>` armed on the worker that finished at 5
minutes would
have returned at 5 minutes. The 55 minutes could only be burned by a hold that
was not bound to that worker's settle: a timer to the ceiling. Settle detection
is sound for the done case. The fix is to stop using timer holds, not to repair
detection.

### Where the timer hold came from

The remedy that landed one hour earlier
(`2026-08-26-meta-orchestrator-wait-churn`) told a churning meta to "hold on one
bounded background wait keyed to material events (a worker's a2a hand-back, a
roster or status change, a timeout ceiling)." Listing a timeout ceiling as a
keying event is the defect: a ceiling is not an event, it is a bound, and a hold
whose wake is its ceiling is a timer. That remedy traded the churn of mode 2 for
the wasted wall-clock of mode 1. The user's new complaint lands directly on it.

## Options considered

| Option | What it does | Why not / why |
|---|---|---|
| A. Longer ceilings, accept the heartbeat | raise timeouts so long work is not cut off | Rejected. The struck mode was the only argument for it, and a longer ceiling makes mode 1 strictly worse: more wall-clock burned when work finishes early. The user said not to lengthen ceilings. |
| B. Permit a literal shell sleep for spaced polling | a background sleep spaces re-checks | Deferred: it depends on a decision the user still holds (permit shell sleep), and a poll still wastes up to its interval and never fires at completion. Useful only for the residual case below, not as the primary mechanism. |
| C. Settle-bound wait + read on every return | never a timer; read the agent to disambiguate the three states | Solves modes 1 and 3. On its own it reintroduces mode 2: a settle net on a parked-but-working worker returns instantly and the watcher re-arms into churn. |
| D. Push-primary + settle-net + read-before-act (chosen) | the worker's hand-back push is the primary wake; the settle wait is a safety net; every return is a cue to read | Solves all three and breaks the churn-versus-idle dilemma at its root. Completes a contract two skills already assume. |
| E. Rebuild the primitive to be state-aware | teach herdr's wait to distinguish parked/working/quota-dead | Rejected for now: that is herdr product work outside this kit. The read-before-act rule gets the same discrimination at the instruction layer with no tool rebuild. |

## Chosen design

Three rules, and they compose. C is the floor; D adds the push that lets C hold
all three modes at once.

### 1. The wait outcome is a cue to read, never a state

A settle and a timeout each name an event, not a state. On every wait return the
monitor reads the agent before deciding its next move:

| Return | Read | Then |
|---|---|---|
| Settle | the agent's content (`herdr agent read`) | a declared hand-back means done, handle it; work in progress plus a momentary idle means parked, do not churn |
| Timeout | the agent's usage gauges (`c2d status`, the barred gauge and 5h/7d/mo windows) | progressing means working, re-arm; a usage gauge at its limit means a quota park, handle it as a park (re-arm long to the reset, never restart), never keep extending long ceilings on an agent not confirmed alive |

This rule already had a seed ("a wake firing is a cue to verify"). The design
makes it carry the full three-state discrimination and names the usage read as
the timeout-side half.

### 2. The settle wait is a safety net, and its ceiling is a bound, not a wake

A backgrounded `herdr agent wait <agent> --timeout <ceiling>` is settle-bound: it
returns the instant the agent settles, so a worker done at 5 minutes wakes the
monitor at 5 minutes. The ceiling is the longest the monitor will stay blind
before a heartbeat check, a fallback for a wake that never arrives. A hold whose
wake is its ceiling is a timer, and a timer that sits to its ceiling while the
work already finished is the wasted wall-clock the user named. A timeout ceiling
is struck from the list of events a wait is keyed to.

### 3. The worker's hand-back push is the primary completion signal, addressed to the meta

`catalyst-v2-orchestrating-delegates` already runs this shape for the
meta-to-orchestrator hop: "the hand-back arrives via steer (direct delivery);
the wake is a safety net." The design generalizes it down one hop. A worker's
completion hand-back is an a2a push (`c2d steer`) addressed to the wave's
monitoring meta, which verifies and hands to the orchestrator. The push fires at
real completion and says done without ambiguity, so it wakes the meta at 5
minutes with no wasted wall-clock and no dependence on the flaky settle. The
meta-owned settle wait stays armed underneath as the safety net, so an ended
turn is never wakeless and a worker that dies without pushing is still caught at
the ceiling.

This is the rule that breaks the churn-versus-idle dilemma. Against a
parked-but-working worker the monitor neither tight-loops on instant settles nor
sleeps out a blind timer: it holds the settle net and lets the push deliver the
completion when it lands.

The meta skill already assumed this ("your workers hand back over a2a, that push
wakes you"), and the dispatch tool already models a meta-to-orchestrator
hand-back. The gap was that no brief-authoring rule told worker specs to address
the push to the meta, so the field addressed it to the orchestrator and the meta
was starved of its primary wake. The design closes that gap in
`catalyst-v2-planning-artifacts`.

## How the design meets each acceptance criterion

| Criterion | Met by |
|---|---|
| Agents stay responsive; no foreground blocking | Every wait is backgrounded; the foreground ban and its guard are untouched. |
| Mechanism is open | The chosen mechanism is a push-primary signal with a settle-bound safety net, not a bare `herdr agent wait` loop. |
| Background sleeps permitted when the monitor judges it necessary | The sanctioned background wait is the settle-net hold; the monitor holds one once its agents read healthy. It sleeps until the push, the settle, or the ceiling. |
| No idle waiting on already-completed work | The push wakes the monitor at completion, and the settle net returns at the settle. Neither holds to a ceiling on finished work. The timer hold that did is struck. |

## What this revises from the hour-ago fix

`2026-08-26-meta-orchestrator-wait-churn` is one hour old and carries no sunk
cost. Two of its three edits stand; one is revised.

| Its edit | Disposition |
|---|---|
| Meta skill: the orchestrator is the meta's watcher, never wait on it | Stands. |
| Meta skill and mux skill: check the monitored workers on an instant settle before re-arming | Stands, and is extended to the full three-state read. |
| Meta skill and mux skill: "hold on one bounded background wait keyed to material events (..., a timeout ceiling)" | Revised. The timeout ceiling is struck as a keying event; the hold is named settle-bound with the ceiling as a fallback bound; the push is elevated to the primary wake. |

The earlier incident's record is updated so it does not read as final: its Fix
section gains a revision note pointing here.

## What it costs

- Worker briefs name the monitoring meta as the hand-back recipient. A
  brief-authoring change, one line in the spec.
- The monitor does one extra read per wait return (content or usage). Cheap
  against the budget a churn loop or a 55-minute idle burns.
- One case still has no clean mechanical wait, below.

## Boundaries left to the user

Two decisions were already pending with the user from the last incident. The
design does not pre-empt either.

1. **A literal shell sleep.** The design needs no shell sleep in the normal
   path: the push wakes at completion and the settle net is event-bound. One
   residual case wants a real background timer: an all-parked-quiet wave where
   the push has failed and every settle wait instant-returns, so a spaced
   re-check has nothing to bind to. Spacing it needs a background sleep, which
   the sleep-guard extension refuses. If the user permits a bounded background
   sleep, that is the clean spacer for this one case; until then the monitor
   relies on the push plus the settle net and does not hold a blind timer. This
   is the only place the design touches the pending shell-sleep decision.
2. **Whether kit changes are branched or PR'd.** This work is left uncommitted
   for the user's review.

## Findings left for the user, not fixed here

`c2d status` counts a live `herdr agent wait <name>` regardless of which harness
owns it (wake.mjs, the liveWaitFor scan). It discards orphaned waits but does
not attribute a live wait to its owner. In the reporting session a meta
armed waits on three workers, the orchestrator's own waits on the same three
died (exit 144), and status still read the wave healthy because a live wait
existed, so the orchestrator believed it was watching agents it was not.

Under the chosen design only the monitoring meta waits on a worker, and the
orchestrator waits on the meta, so no two watchers contend for one worker's wait
and the misread does not arise in a clean wave. The displacement (whether the
meta's waits killed the orchestrator's) is unverified: confirming it needs a
live repro with contending waits, which this instruction repair did not run. An
owner-attribution field on the status wake block would make the misread
impossible even under role confusion. It is tool code, a separate fix-in-
progress owned by an implementing wave, left for the user to schedule.

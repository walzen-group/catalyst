# A meta died on a wait that was armed then silently gone, and c2d status read the stalled wave healthy

**Status:** filed; repair landed in this same dispatch (2026-08-26): two
tool-code changes in c2d (wake.mjs owner attribution, status.mjs open-wave and
stranded-meta classification), guarding test authored, red and green recorded,
live mechanical proof against a real herdr wait. Nothing report-only remains;
one adjacent tool item is named for the user below.
**Filed:** 2026-08-26
**Store:** kit-level (catalyst system failure); names the project damage
(statswatch wsl-cuda-flake and testdata-dvc dispatches below).
**Owning files:** `skills/catalyst-v2-dispatch/src/wake.mjs` (liveWaitFor owner
attribution, new readProcessOwner) and
`skills/catalyst-v2-dispatch/src/status.mjs` (classify open-wave and
stranded-meta detection, the owner-aware wake note).
**Related record:** `.cortex/reports/2026-08-26-wake-subsystem-design.md`, whose
deferred owner-attribution finding this incident acts on.

## Answer first

Two agents stalled the same afternoon on the same tool weakness: c2d status
answers "is this agent watched?" by asking "does any `herdr agent wait <name>`
process exist?", with no regard for who owns that wait or whether the wave is
even still open.

meta-wsl-cuda-flake armed its own settle-wait on its worker, confirmed it live,
parked, and its wait then died without firing while the worker's hand-back push
also never arrived. Its worker had settled, so c2d status read the wave healthy
("no worker is in flight") and the orchestrator moved on. The meta sat 25 minutes
with its verification undone, recovered only by a manual steer. An hour later
meta-testdata-dvc, briefed in as many words to check its own wait was alive, read
c2d status showing a live wait against its worker with the note "its owner will
be woken", concluded it was covered, and armed nothing. The wait it read was the
orchestrator's, not its own.

The repair moves the detection into the tool. wake.mjs now attributes every live
wait to its owning pane, and the status wake block says whether the wait is
yours; a reader can no longer take another agent's wait for its own coverage.
classify() reads "no worker in flight" as healthy only when no meta is still
open, and surfaces a meta parked on a dead wake as UNWATCHED, so a settling
worker never buries a stranded meta under a healthy verdict.

## What the user wanted

User words, verbatim. The observation:

> look at meta-wsl-cuda-flake, it's not cleaned up and it died on a failed wake.
> this is exactly why i always wanted a wait armed, but now we're hitting the
> opposite case where we just get stuck without proper cleanup or checkup

The filing instruction:

> yes create an incident

The user names the shape precisely: the repairs that made agents always arm a
wait produced the opposite failure, an agent stuck on a wait that will never
fire, with nothing checking on it. What was wanted is a checkup: a way for the
system to notice a stuck wave rather than read it healthy and move on.

## What went wrong

### First stall: a wait armed, confirmed, then silently gone

Dispatch 2026-08-26-flake-wsl-cuda. Worker impl-wsl-cuda-flake, meta
meta-wsl-cuda-flake, both omp/deepseek-v4-flash.

The meta followed the discipline the day's earlier repairs installed. Its own
first-person account, from its hand-back:

> I armed the settle-wait on impl-wsl-cuda-flake at dispatch (herdr pid 947475,
> confirmed running via c2d status), parked on it with the worker's a2a hand-back
> push as primary wake. Neither fired. The wait died without firing (pid gone
> from process table ~25 min after the worker committed 6656ae1 at 11:45:47 and
> went idle); no hand-back push reached me or you. I was woken only by your
> steer. Both wake channels failed simultaneously; my park contributed nothing
> and I never woke on my own.

So both wake channels of the day's chosen design, the worker's a2a hand-back push
(primary) and the settle wait (safety net), failed at once. The worker settled at
11:45:47 and committed 6656ae1. From that moment nothing was in flight, and
c2d status classified the wave healthy on its first rule, "no worker is in
flight". The orchestrator, reading healthy, moved to another wave without
confirming this one had closed. The meta sat parked 25 minutes with its
verification undone, and woke only when the orchestrator steered it by hand.

### Second stall: a live wait read as coverage, owned by someone else

Dispatch 2026-08-26-testdata-dvc. Worker impl-testdata-dvc, meta
meta-testdata-dvc, omp/deepseek-v4-flash. The meta's brief carried the repaired
discipline explicitly, including a line telling it to confirm its own wait's pid
was still in the process table and not to park on faith. Ninety seconds after
dispatch its pane read "Parked." with no wait of its own in the process table.
Asked whether it had armed a wait and, if it believed it had, what gave it that
belief, the meta answered verbatim:

> NO, I had not armed a wait before your steer. What I believed: c2d status at
> 12:49 showed a live wait for impl-testdata-dvc (pid 990546) with note 'a live
> wait is running for this agent and its owner will be woken', and ps confirmed
> the herdr wait process running — I assumed the launch harness had armed it for
> me. It was yours.

The wait it saw belonged to the orchestrator. The meta checked, exactly as
briefed, saw a live wait reported against its worker with a note asserting the
owner would be woken, and concluded it was covered. The note was true and the
coverage was another agent's. The meta parked with nothing able to wake it while
its worker ran, and c2d status classified the wave META QUIESCENT, the same
verdict it returns on a healthy parked meta, so the reading did not distinguish
the stranded meta from a fine one.

### Mechanical fact behind both stalls

A live wait process carries its owner's herdr identity in its environment
(HERDR_PANE_ID, HERDR_TAB_ID), because a wait is a background job of its owner's
harness and inherits that harness's pane. Measured live on this host against the
two waits running during this investigation: pid 985487
(`herdr agent wait meta-incident-waitdeath`) and pid 990546
(`herdr agent wait impl-testdata-dvc`) both carried HERDR_PANE_ID=w7:p1, the
orchestrator's pane. So "whose wait is this" is a checkable fact the tool had in
reach and did not read.

## Project damage

| Dispatch | Damage |
|---|---|
| 2026-08-26-flake-wsl-cuda | Wave stalled about 25 minutes with the worker committed (6656ae1) and verification undone; the meta never woke on its own and recovered only by a manual steer; the tab was left uncleaned. |
| 2026-08-26-testdata-dvc | The monitoring meta parked within 90 seconds with no wait it owned, unable to wake while its worker ran; recovered by an orchestrator steer that told it to arm its own wait. |

## Recurrence scan

All wake-subsystem incidents were read in full before filing. This is the fourth
wake-subsystem failure in three days, and it is a recurrence of a deferral rather
than a fresh defect.

**Recurrence of the deferred finding in
`2026-08-26-wake-hold-idled-on-completed-work` and the design report
`2026-08-26-wake-subsystem-design`.** Both, filed hours earlier the same day,
identified the exact tool weakness behind today's second stall and left it for
the user to schedule. The design report's Findings section:

> c2d status counts a live `herdr agent wait <name>` regardless of which harness
> owns it (wake.mjs, the liveWaitFor scan). It discards orphaned waits but does
> not attribute a live wait to its owner ... an owner-attribution field on the
> status wake block would make the misread impossible even under role confusion.
> It is tool code, a separate fix-in-progress owned by an implementing wave, left
> for the user to schedule.

The disposition was "mitigated by role discipline under this design, so the
misread does not arise in a clean wave". A failure arose within hours, and it was
role discipline that broke: a meta briefed to check its wait read another agent's
wait as its own. Per the filing rule, an earlier fix not taking is the root
cause; here the earlier disposition was to defer while judging the risk
mitigated, and that judgment is what left the tool reporting liveness without
ownership. The design report's "What stays open" also named a second status-tool
gap (a live wait counted regardless of owner leaves a wave reading healthy while
the intended watcher's wait died), the same shape as today's first stall from the
open-wave side.

**Sibling of the churn and idle incidents.** `2026-08-24-wake-churn-on-parked-meta`,
`2026-08-26-meta-orchestrator-wait-churn`, and
`2026-08-26-wake-hold-idled-on-completed-work` are the three prior members of the
family. Each repaired agent wait discipline in skill prose: recognize instant
settles, never wait on the orchestrator, hold a settle-bound net with the push as
primary. Today's failure is downstream of the design those three converged on: it
leans the whole safety net on a settle wait and a push, and provides nothing that
notices when both channels die silently. The prose is sound; the gap is that no
tool reading catches its failure.

### Pattern across four incidents

Three incidents patched skill prose telling agents how to wait. The fourth-stall
evidence shows prose reached its limit: a meta was briefed in plain words to
check its own wait was alive, complied exactly, and still stalled, because the
check it was told to run answered the wrong question ("is a wait running?" rather
than "is MY wait running?"). A subsystem patched rule-by-rule in instruction text
cannot catch a wait process dying or a push failing to land; those are mechanical
events, and only the tool that reads the process table can see them. This
incident moves the detection there. Both of today's stalls trace to c2d status
answering a question adjacent to the one that mattered, and the repair corrects
the tool's answers rather than adding a fifth prose rule.

## Root cause

c2d status and wake.mjs answer two questions with a weaker question each.

1. **Ownership.** "Is this agent watched?" was answered by "does any
   `herdr agent wait <name>` process exist?". liveWaitFor discarded orphaned
   waits but never attributed a live wait to its owner, and the status wake note
   asserted "a live wait is running for this agent and its owner will be woken".
   True and useless to a reader deciding whether it is covered: the owner may be
   another agent. A meta read the orchestrator's wait as its own coverage and
   armed nothing.

2. **Wave closure.** "Is this wave healthy?" short-circuited to healthy the
   instant no worker was in flight. classify()'s first line returned healthy on
   "no worker is in flight", so all of its meta scrutiny (unbriefed, quiescent,
   retired-early, wake-gap) was unreachable the moment a worker settled, which is
   exactly when a meta still owes verification and a hand-back. A meta stranded on
   a dead wake after its worker settled read healthy.

Both are mechanically detectable facts the tool had in reach: the owning pane of
a wait (from the wait process's environment) and whether a meta is still open
after its workers settle.

## Fix

Landed in this dispatch, one dispatch with the incident. Tool code only. No skill
prose was added: the fourth-stall evidence is that a fresh agent following the
prose still stalled, so the durable remedy is the tool reading the fact rather
than another instruction to read it.

| Change | File | What it does |
|---|---|---|
| readProcessOwner | wake.mjs | Reads a process's owning herdr pane and tab from its environment (HERDR_PANE_ID/HERDR_TAB_ID via /proc/<pid>/environ), injectable for the unit suite. |
| liveWaitFor owner fields | wake.mjs | Attaches owner_pane and owner_tab to a found (non-orphan) wait, so a live wait carries whose it is. |
| status wake block | status.mjs | Adds owner_pane, owner (the owning agent's name, mapped by pane), and owned_by_caller; the note names the owner and says "not you" when the reader is not the owner, and never asserts bare coverage. |
| classify open-wave | status.mjs | "No worker in flight" is healthy only when no meta is still open (present and not exited); otherwise the meta's state decides, as it does with workers in flight. |
| classify stranded-meta | status.mjs | A meta that reads settled or parked with its own wake dead is UNWATCHED (stranded), naming the meta and calling for a probe and a re-armed wait, rather than the probe-first META QUIESCENT that reads the same on a healthy park. |

The stranded-meta rule discriminates the reading the second stall exposed: a
parked meta with a live wait on it is a healthy park (someone is woken when it
settles), and a parked meta with a dead wake is stranded (no one is). The owner
attribution and the classification are independent, so each of the two stalls is
caught by its own change.

## Verification

Mechanical verification, per the tool-fix path (the mandate's rule: mechanical
verification for tool changes, and a tool that reads the process environment is
proven against a real wait process, beyond the injected fakes of the unit cases).
Test-first order per catalyst-v2-sdd-rules: the failing runs were recorded before
the fix.

**Red (unfixed tool):** in the dispatch unit suite,
`test/wake.test.mjs` failed to load (no readProcessOwner export), and
`test/status.test.mjs` failed two new cases: "a settled worker whose meta is
parked with a dead wait is UNWATCHED, not healthy" (classify returned healthy)
and "a wait owned by another pane is reported as not-yours, never bare coverage"
(no owner attribution, the note asserted bare coverage). Recorded in the test's
red-run.txt.

**Green (fixed tool):** the full dispatch suite runs 176 tests, 176 pass, 0 fail,
no regressions across the tool. wake.test.mjs 12/12, status.test.mjs 15/15.
Recorded in green-run.txt.

**Live mechanical proof:** the shipped functions run against a real herdr wait
process on this host. readProcessOwner(985487) returns pane w7:p1, tab w7:t1;
liveWaitFor("meta-incident-waitdeath") returns running true, owner_pane w7:p1,
attributed to the orchestrator and distinct from the reader's own pane w7:p14.
The environment read is the mechanism the fix depends on, and it reads a real
wait's owner correctly.

**Guarding test:** suite scan found the three wake tests
(wake-churn-on-parked-meta, meta-orchestrator-wait-churn, and the extension the
hold-idled fix made to the latter) all guard agent wait discipline in skill
prose, a different rule from this tool-level detection, and meta-retirement-
misdiagnosis guards the probe-before-retirement judgment. None covers wait
ownership or the open-wave classification, so a new mechanical guard test was
authored: `.cortex/.tests/catalyst/wake-liveness-without-owner/`. It follows the
foreground-wait-guard precedent for a mechanical tool-boundary fix (deterministic
checks, no semantic judge): its checks import the live tool functions and assert
owner attribution, the stranded-meta classification, and the owner-aware note
(running the dispatch unit suite as the backstop). The first recorded run
(history/2026-08-26-fix-mechanical-proof) transcribes the red-then-green proof
above; 3/3 mechanical criteria pass, no-contamination unverified (no actor
session on a mechanical run), matching the transcribed-baseline pattern.

## What stays open

One adjacent tool item, named for the user, not a blocker.

**Wave-level coverage attribution.** classify() still treats a live wait on a
worker as coverage regardless of owner: the per-agent wake block now carries the
owner so a reader can tell its own wait from another's, but the wave verdict does
not yet require that a worker's wait be owned by its monitoring meta rather than
by the orchestrator. Under the design, the meta watches workers and the
orchestrator watches the meta, so a worker whose only live wait is the
orchestrator's is watched by the wrong party. Making the healthy verdict
topology-aware (a worker is covered only by its meta's wait) is a further
tool change with a wider blast radius on the classification, left for the user to
schedule; the owner fields this fix adds are the data that change would build on.

**A literal shell sleep** remains the pending decision carried forward from
`2026-08-26-wake-hold-idled-on-completed-work`, unchanged here.

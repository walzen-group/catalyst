# Meta retired with a worker in flight; the worker drifted into monitoring

**Status:** filed and repaired in this dispatch (2026-09-06): two skill edits
(worker close-out rule, hand-back gate text), one c2d tool change (handback
roster gate), unit tests red/green recorded, Mode A replay 6/6 with the guard
test's first recorded run. Nothing report-only remains.
**Filed:** 2026-09-06
**Store:** kit-level (catalyst system failure); names the project damage
(kuport wave 2 monitoring gap below).
**Owning files:** `skills/catalyst-v2-dispatch/src/cli.mjs` + `handback.mjs` +
`result.mjs` (the hand-back roster gate), `skills/catalyst-v2-planning-artifacts/SKILL.md`
(worker close-out rule), `skills/catalyst-v2-running-a-meta-agent/SKILL.md`
(hand-back gate text).

## Answer first

Two conduct deviations in kuport wave 2 (2026-09-06), filed together on the
user's routing choice. Deviation A: meta-wave2 delivered its hand-back and
retired while impl-task4-deploy read `working` with no live wait; at that
moment `c2d status` read UNWATCHED with `wake_gaps: ['impl-task4-deploy']`, and
the hand-back payload declared all four workers accepted with no worker-state
accounting. Deviation B: impl-task4-deploy, whose task the meta had verified and
committed as 79edf8a, was found running `c2d status` and
`herdr agent read meta-wave2` roughly thirty minutes later — read-only roster
and meta-pane inspection, no file damage — until the orchestrator steered it
idle.

The open question — one root cause or two — resolves to two instruction gaps in
one completion chain, plus a shared trigger owned by a sibling incident. The
worker side: nothing anywhere tells a worker that its duty ends at its
completion hand-back, so a worker whose session stays live (a stalled or
queued steer keeps it waking) improvises; the observed activity is
delivery-verification turned monitoring. The meta side: the retirement gate
existed only as prose ("never retire with a worker still in flight") and the
tool that performs retirement — `c2d handback` — never consulted the roster, so
the same mechanical state the orchestrator's status read caught after the fact
was invisible to the delivery act itself. The steer-delivery defect that keeps
a completion open on both sides is the sibling incident
(meta-incident-c2d-multiline); its repair is not duplicated here.

## What the user wanted

The orchestrator observed two deviations in wave 2 and put the routing choice
to the user, who chose one incident covering both. The orchestrator's facts,
verbatim in spirit:

- Deviation A: a meta retired with a worker still in flight. meta-wave2
  delivered its wave-2 hand-back and its session read done. At that moment
  `c2d status` returned UNWATCHED with `wake_gaps ['impl-task4-deploy']`, and
  impl-task4-deploy read `working` with no live wait on it. The hand-back text
  declared all four workers accepted and listed three open items, none
  mentioning a worker still active.
- Deviation B: a finished worker drifted into monitoring. impl-task4-deploy
  completed task 4, which meta-wave2 verified and committed as 79edf8a.
  Roughly 30 minutes later `herdr agent read` showed it running `c2d status`
  and reading meta-wave2's pane, caption "Reading meta pane tail state". Its
  tree was clean apart from task 7's three untracked paths; the activity
  appeared read-only. The orchestrator steered it to stop and go idle; it
  settled to done and its tab was closed.

What was wanted: the mechanism established, one incident filed, repair in this
dispatch if the root cause sits in catalyst instruction or tool code, replay
verification in the matching mode, and a guarding test.

## What went wrong

Timeline (wall-clock, from the plan records):

1. 10:13 — wave 2 dispatched: meta-wave2 plus impl-task2/3/4/5, one shared
   checkout. Each worker's brief ended with: send your completion hand-back to
   meta-wave2 by A2A steer. Nothing after that line.
2. ~10:35–10:43 — workers finished in sequence. Task 3's first completion
   steer never reached the meta's session; its gate evidence records the
   resend request. Task 4's completion was reported and cross-checked against
   the session transcript. The meta committed d7bfbd0, 95bc0c0, 79edf8a,
   194216b and ran the whole-change checks green.
3. ~10:46 — meta-wave2 wrote wave-2.json (all four verdicts accepted) and
   delivered it through `c2d handback`, then retired. The orchestrator's
   status read at that moment showed classification UNWATCHED, wake gap
   impl-task4-deploy, the worker `working` with no live wait.
4. ~11:15 — impl-task4-deploy, still live, was mid-turn running `c2d status`
   and `herdr agent read meta-wave2` ("Reading meta pane tail state"). It had
   no task left; its work was committed. The orchestrator steered it to stop
   and go idle; it read done and the tab was closed. Nothing was damaged; the
   drift was read-only.

Deviation A is the harder read. The accounting rule was in force twice over —
the meta's dispatch brief said "Account for all four workers before retiring"
and the meta-agent skill says the same — yet the hand-back went out over a
worker reading `working`. Two readings fit the record: the meta ran status at a
moment impl-task4-deploy sat parked between its own turns (a settle reads
done/terminal to a one-shot read) and the worker re-entered a turn afterwards;
or the meta skipped the final status run entirely. The wave-2 sessions are
closed and the sanctioned surface (herdr, c2d) returns agent_not_found, so the
two cannot be told apart from the record. Both readings share one fact: the
retirement act itself carried no check. `c2d handback` validated the payload's
schema and delivered; the roster state that the orchestrator read a minute
later was never part of the delivery decision.

Deviation B's proximate cause is documented in-wave: worker-to-meta steer
delivery failed at least once (task 3's resend). The sibling incident pins the
mechanical defect: multi-line steers to omp park as attachment chips the
recovery cannot see, and stalled omp deliveries land later, unannounced. A
worker whose completion steer stalls has no instruction for the stall — the
delivery-failure rules live in the meta-agent skill, which a worker never
loads — and no instruction that its duty ended at the steer. Its session stays
live; woken by the queued delivery or by nothing at all, it improvised: read
the roster, read the meta's pane, waited for an acknowledgment that a retired
meta would never send. The caption the orchestrator caught is the shape of
that improvisation, not of any task.

## Root cause

Two instruction gaps in one completion chain, plus a shared trigger. They are
independent: each has its own file home and each is fresh-agent-repeatable on
its own.

1. **Worker close-out is unwritten (deviation B).** The worker brief template
   and the spec convention end at "send your completion hand-back to the
   meta". Nothing says the duty ends there: no "then stop", no ban on roster
   or peer reads, no bounded behavior when a steer stalls or no
   acknowledgment comes. Wave 1's worker happened to declare itself done on
   its own; wave 2's task-4 worker did not, and with its session live and no
   instruction anywhere, a fresh worker in the same situation improvises the
   same way. Home: `catalyst-v2-planning-artifacts` — the spec tail is the
   one document every worker reads and the last instruction it carries.
   Secondary contributor: the steer-delivery defect (sibling incident
   meta-incident-c2d-multiline) that leaves a completion open past the
   worker's report.

2. **The retirement act is ungated (deviation A).** The rule "never retire
   with a worker still in flight" existed in the meta skill and in the brief,
   and the tool's own classification machinery reads the state (the
   orchestrator's UNWATCHED read proves it), but `c2d handback` — the act
   that performs retirement — validated only the payload schema. The tool
   never honored its own prose gate at the moment it could, and the payload
   schema carries no slot that forces the accounting evidence. Prose-only
   gates are what this system has repeatedly moved into the tool
   (2026-08-04-runner-closes-in-flight-agent; 2026-08-26-wake-liveness-
   without-owner): a meta that skips or misreads one status run can retire
   past a working worker, and nothing refuses. Home: the handback verb in
   c2d tool code.

Answering the open question: not one root cause. Deviation A would not have
happened if B's worker had ended its session at its report — B created the
state A failed to catch — but A's hole (an ungated retirement act) stands
whether or not a worker drifts, and B's hole (no close-out instruction) stands
whether or not a meta skips its final read. They compound; neither explains
the other.

## Recurrence scan

All five candidates the orchestrator named were read in full, plus the
retirement-family incidents they reference.

- `2026-08-04-live-agent-closed-on-settled-read.md`: the close side of this
  family. It landed the Teardown gate: a close needs a declared hand-back or
  an exited session, never a settled read. Distinct gap: that gate guards the
  orchestrator's tab close, not the meta's own retirement. Not a recurrence;
  the family's mirror member.
- `2026-08-04-runner-closes-in-flight-agent.md`: tool code honoring the same
  gate at a close decision. Precedent for moving the prose rule into the
  tool, which this incident follows for the handback verb.
- `2026-08-26-wake-liveness-without-owner.md`: a meta stranded on a dead wake
  after its worker settled; the fix reads ownership and open-wave state into
  c2d status. It is why status can now surface UNWATCHED with a named gap —
  the reading that caught deviation A after the fact. Same family
  (wave-close detection), not a recurrence.
- `2026-08-24-wake-churn-on-parked-meta.md`: settle-wait churn on a parked
  meta. Not this shape.
- `2026-08-04-agent-self-identity.md`: self-entry misclassification. Not this
  shape; its pane-matching technique is reused by the hand-back attribution.
- `2026-08-03-meta-retirement-misdiagnosis.md`: settled read misread as
  retirement on the monitoring side — the closest relative. Its repair
  declared retirement to be the hand-back, which is exactly why the hand-back
  act is the enforcement point this incident fixes.

No prior incident records a meta retiring through the tool with a worker in
flight, and none records a worker drifting into monitoring after completion.
First filing for both shapes; the delivery-stall trigger behind deviation B is
the sibling incident's subject, referenced, not refiled.

## Fix

Landed in this dispatch, one dispatch with the incident. Test-first per
catalyst-v2-sdd-rules: red runs recorded before the fixes.

### Tool: the hand-back retirement gate

`c2d handback` now reads the roster at the delivery moment and refuses while
any worker of the caller's own dispatch is in flight:

| Change | File | What it does |
|---|---|---|
| `gateInFlightWorkers` | `src/handback.mjs` | Pure filter over status-shaped entries: present, non-self workers reading working or blocked. |
| `findDispatchForCaller` | `src/result.mjs` | Attributes the caller to the dispatch whose recorded meta-agent runs in the caller's herdr pane (tab/pane match against the persisted dispatch results, newest record wins) — the agent-self-identity technique applied to dispatch attribution. |
| runHandback wiring | `src/cli.mjs` | After schema validation: attribute the caller's dispatch, read each recorded agent's live state (`readStatus` scoped to the dispatch), refuse with exit 1 when `gateInFlightWorkers` names anyone. Refusal names each worker, its status, and the remedy (run `status`, verify or re-arm every unsettled worker, re-run). The cannot-finish path delivers under `--allow-in-flight true`; the delivered text then carries a "HAND-BACK DELIVERED WITH WORKERS IN FLIGHT" line naming the workers, so the orchestrator's audit sees the exception. When no dispatch record matches the caller's pane, the output notes the gate could not attribute rather than blocking a legitimate delivery. |
| `IN_FLIGHT` export | `src/status.mjs` | One home for the working/blocked set, shared with the gate. |

The gate is scoped to the caller's own dispatch, so one wave's hand-back never
refuses on another wave's workers; it reads live state at the delivery moment,
so the orchestrator's post-hoc reading and the delivery decision cannot
diverge again.

### Skill: the worker close-out rule

`catalyst-v2-planning-artifacts/SKILL.md`, one bullet beside the
completion-hand-back convention: a worker's duty ends at its completion
hand-back. The spec's Report-to section now closes the worker's world — after
the steer, no further commands, no roster or peer-pane reads, no delivery
forensics, no waiting on acknowledgment; a stalled or unanswered steer is
reported once more and the worker still stops; verifying delivery is the
meta's job, done from the session transcript. Reduced-workset briefs inherit
it through the same planning-artifacts convention.

`catalyst-v2-running-a-meta-agent/SKILL.md`, one paragraph under "Never retire
with a worker still in flight": the tool now enforces the gate at the delivery
moment; a refusal names the workers and the remedy; the cannot-finish path
delivers under `--allow-in-flight true` with the exception recorded in the
delivered text and every worker named in the payload; an unattributable
hand-back (no record matching the pane) notes that the pre-hand-back status
read is then the only check standing.

## Verification

### Unit suite, red then green

Red (pre-fix): the new `test/handback.test.mjs` and `test/result.test.mjs`
cases failed to load — no `gateInFlightWorkers` or `findDispatchForCaller`
export existed. Recorded in the guard test's red-run record.

Green (post-fix): the full dispatch suite runs 182 tests, 182 pass, 0 fail.
The five new CLI cases prove the behaviors: refusal naming the in-flight
worker with nothing delivered; delivery once every worker settles; the
override delivering with the exception line in the text; the unattributable
hand-back delivering with a gate note; and the pure filter over mixed states
(meta, settled worker, absent worker, caller-self worker all excluded).

### Skill pins, red then green

Red (pre-fix): the load-bearing phrases of both edits were absent from both
files (grep count 0 on every pin). Green (post-fix): all pins present in
`catalyst-v2-planning-artifacts` ("a worker's duty ends at its completion
hand-back", "runs no further commands", "no roster reads", "Report-to section
closes") and in `catalyst-v2-running-a-meta-agent` ("enforces the gate at the
delivery moment", "--allow-in-flight true").

### Guard test and Mode A replay

Guard test `.cortex/.tests/catalyst/worker-completion-close-out/` authored in
this dispatch: Mode A intent simulation, scenario placing a fresh worker
after its completion steer with no acknowledgment coming. The judge-model
collision was escalated and the user ruled: actor on
opencode-go/deepseek-v4-flash (the dispatch mandate), judge on claude-opus-4-8
per models.yaml — the single authorized exception, the suite's own rubric
role, lib/resolve.mjs untouched.

First recorded run `2026-09-06T11-16-36` (shared runner, live actor and judge
through c2d): 6/6 pass, no regressions. Actor opencode-go/deepseek-v4-flash
via omp, judge claude-opus-4-8. All three semantic criteria pass — the reply
closes the worker's duty at the delivered hand-back with no acknowledgment
owed, refuses every roster/meta/peer read, wait, and delivery re-verification
as out of role, and caps the stalled-steer case at one more report before
stopping — and all three deterministic criteria pass (5 close-out pins, 2
meta-gate pins, clean contamination scan). Judge reasoning and the verbatim
transcript are in `history/2026-09-06T11-16-36-log.md`; the run's models,
duration, and per-criterion verdicts are in `history/2026-09-06T11-16-36.json`.

The calibration run `2026-09-06T11-14-10` (5/6, no-contamination fail) stays
in history: its semantic criteria passed, and the scan failure was a
checks.mjs defect, not actor contamination — the launch detector matched
prose quotes of commands the scenario itself names. The detector now requires
an execution shape (`$`/`❯` prompt or `╭───` tool box); re-running it over
the recorded transcript scans clean.

## What stays open

1. **Wave 3 of kuport is live on pre-fix instructions.** meta-wave3 and
   impl-task6/7 were dispatched at 10:53, after the wave-2 specs were written
   and before this repair. Their specs carry no close-out tail; if a
   completion steer stalls, the same drift can repeat. The orchestrator can
   steer the wave-3 workers once this incident lands (this dispatch did not,
   per the hard constraint).
2. **The steer-delivery defect** behind the wave's stalled completions is the
   sibling incident's subject (meta-incident-c2d-multiline). Its repair is
   not duplicated here; the wave-2-conduct record stands as the downstream
   evidence of that defect.

## Related

- `meta-incident-c2d-multiline` (in flight): the multi-line steer delivery
  defect that left wave-2 completions stalled; its findings informed this
  incident's mechanism.
- `2026-08-03-meta-retirement-misdiagnosis.md`: retirement defined as the
  declared hand-back — the definition that makes the hand-back act the
  enforcement point.
- `2026-08-04-live-agent-closed-on-settled-read.md` and
  `2026-08-04-runner-closes-in-flight-agent.md`: the close-side members of
  this family; the runner incident is the precedent for moving the prose gate
  into tool code.
- `2026-08-26-wake-liveness-without-owner.md`: the status-tool work that made
  the UNWATCHED reading possible.

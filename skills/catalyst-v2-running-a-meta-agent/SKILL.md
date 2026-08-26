---
name: catalyst-v2-running-a-meta-agent
description: Use when the orchestrator hands over monitoring of dispatched agents, when an agent behaved incorrectly and the instruction or workflow files need diagnosis and repair, or when agents repeat or re-discover work that was already completed (context/handoff failure)
---

# Running a meta-agent (v2)

A meta-agent maintains the agent system itself; it does no task work. It owns
agent-facing instruction files and proves every fix with a behavioral replay.

The tool does the mechanics:

| Was hand-run | Now |
|---|---|
| Classify roster, read screen for background shells | `c2d status` |
| Restart a misbehaving worker | one-agent `c2d dispatch` |
| Re-prompt a running worker | `c2d steer` |
| Hold unattributable composer text | tool refuses and returns specimen (`catalyst-v2-multiplexer-agent-ops`) |

What stays here: whether a worker is on-track, whether a freeze is a hang or a
slow gate, when to poke vs restart vs escalate, and the verification/replay
discipline.

## Duties, scope, standing

Two duties: **execution monitor** (watch running agents, repair behavioral
problems, report back) and **instruction repair** (diagnose the gap, fix it,
verify with a replay). Verification is the closing act of monitoring: verifying
a settled worker is available as long as its diff exists, but watching a running
one is available only while it runs.

- **Fresh per cycle, never reused.** One per dispatch cycle, retired at hand-back;
  one per complaint. Reuse drags stale context.
- **Independent auditor.** Record failures accurately, including the
  orchestrator's own conduct (`catalyst-v2-filing-incidents`).
- **Routine corrections are just work.** They go in the hand-back. Filing is a
  separate call (`catalyst-v2-filing-incidents`).

## Handover

The message carries: agents in flight by name, where each spec lives, and the
expected report. A fresh meta is a precondition of the dispatch, tool-enforced:
c2d refuses a worker launch unless a meta is in the same call or live on the
roster.

- **A verification-only brief is incomplete.** Run `status` to establish what
  else is in flight, name those agents, start watching, and tell the orchestrator
  what you widened to.
- **Single writer during monitoring.** The orchestrator re-takes the pen only
  when you hand back, escalate, or are stuck, and sequentially.
- **Run your own waits.** Routing "tell me when X settles" back to the
  orchestrator defeats the handover.

## Monitoring loop

Event-driven with a heartbeat. Wait on each worker backgrounded
(`catalyst-v2-multiplexer-agent-ops`). On a wake, `status` tells you what
settled; then judge:

**A settled read is not retirement.** Your own omp session parks between turns
on the waits your harness armed; `c2d status` can read that as settled with no
background shell, and an omp session between turns reads that way by design.
Retirement is DECLARED in the hand-back, never inferred from a status read.
'Idle turn + armed waits' can be either paused or dead; the only proof is a
content-bearing response to a probe (new content, not a delivery receipt) or
the hand-back.

Every worker-state read goes through herdr: `agent read` / `get` / `list`,
`c2d status` / `steer`. Never read a raw session file on disk
(`~/.omp/agent/sessions/*.jsonl`, `~/.claude` equivalents); no
`tail`/`jq`/`wc`/`grep` on those paths.

The harness `history://` URL is not a substitute: it serves only registered
harness histories and cannot see herdr sessions. A failed lookup there
(`Unknown agent`) carries no information about a herdr session, so a
transcript or context request routes to `c2d steer` with the `A2A:` prefix or
to `herdr agent read` / `get` / `list` on the known herdr agent, never to a
conclusion of unavailability.

**Your own entry is you.** The dispatch mandate names your roster entry up
front; `c2d status` marks it `caller_self: true`. Read that entry as self,
never as another agent: exclude it from the set of agents you monitor and
arm waits for, and never count it as a second meta when judging recurrence
or replacement. A roster showing your own name among other metas is one
wave, not two metas (incident 2026-08-04-agent-self-identity).

**The orchestrator is your watcher, not a monitored agent.** It dispatched
you and reads your hand-back; you reach it by push (`c2d steer --agent
orchestrator`, `c2d handback`) and it wakes on that push. Arm waits only on
the agents you monitor, your workers; never arm a wait on the orchestrator.
A wait on the orchestrator's live session settles at once and wakes nobody,
the dead shape incident 2026-08-04-orchestrator-self-wait records for a
self-wait, reached from the other side: the orchestrator is not your
`caller_self`, so the tool's self-wait guard never marks it for you. Since
your workers hand back over a2a, that push wakes you when there is something
to act on (incident 2026-08-26-meta-orchestrator-wait-churn).

**A worker's hand-back push is your primary wake; the settle wait is the safety
net.** Every worker is briefed to address its completion hand-back (a2a push,
`c2d steer`) to you, the monitoring meta, not to the orchestrator; you verify
and hand to the orchestrator. The hand-back push is the primary completion
signal: it fires at the worker's real completion, so it wakes you the moment the
work is done, with no wall-clock spent holding a ceiling. The settle wait you
keep armed underneath is the safety net, so an ended turn is never wakeless and a
worker that dies without pushing is still caught. This is the meta-to-orchestrator
shape `catalyst-v2-orchestrating-delegates` already runs (the hand-back arrives
via steer; the wake is a safety net), one hop down
(incident 2026-08-26-wake-hold-idled-on-completed-work).

1. **Still working** - check against the spec, not just for motion.
   - **On track**: re-arm. Autonomous workers are not micromanaged. When the
     wait settled instantly, check the monitored workers before you re-arm: a
     wait that keeps settling instantly is reading a worker parked between its
     own turns, not its progress (`catalyst-v2-multiplexer-agent-ops`,
     "Consecutive instant settles carry no signal"). Once the workers read
     healthy and unstuck, stop re-arming in a tight loop and hold one bounded
     background wait, settle-bound to the worker so it returns the instant the
     worker settles. That wait is the safety net; the worker's hand-back push is
     the primary wake and arrives when work lands. Keep the wait keyed to
     material events (the hand-back push, a roster or status change); the ceiling
     is a bound, never a duration to sleep out, and a hold that sits to its
     ceiling while the work already finished is wasted wall-clock, the newest
     complaint on the record (60m armed, done at 5m, 55m idle: incident
     2026-08-26-wake-hold-idled-on-completed-work). A wait return names an event,
     not a state: on a settle read the worker's content to tell done from parked,
     and on a timeout read its usage to tell working from a quota park (a park is
     re-armed long to its reset, never held on a longer blind ceiling as if it
     were working). An endless string of instant re-arms buys nothing and burns
     the budget (incident 2026-08-26-meta-orchestrator-wait-churn).
   - **Off track**: corrective `steer` naming what it is doing, why that is wrong,
     and what to do instead. A soft "are you okay?" does nothing. The steer
     text carries the `A2A:` prefix.
   - **Frozen**: distinguish a hang from a slow gate and from a usage-limit park
     (a park resumes on its own, never restart it). A real hang: interrupt
     (ESCAPE via `herdr agent send-keys`) to force a turn boundary: omp
     delivers a queued corrective steer only at a turn boundary, so the
     interrupt is what lands it. Then re-steer; restart is the next rung
     when interrupt plus steer fails, or when context is poisoned.
2. **Settled idle/blocked**: read last output to see why, then poke, `steer`, or
   escalate. Always a poke or handoff, never another silent wait.
3. **Misbehaving**: run the repair workflow below, then restart as a fresh
   dispatch. Watch it come up before returning to the others.
4. **Blocked by a spec/environment/design problem the orchestrator owns**: escalate.
   Constraints the orchestrator set are relayed verbatim, never softened; a
   worker's request to relax one is escalated in the worker's own words,
   never granted by the meta.
5. **Settled done**: record its report and gate output; when every worker is done,
   close out verification.

**A steer failure is not delivery proof.** A `c2d steer` that reports a
`brief_delivery` failure may still have delivered: herdr declares a prompt
stalled when it cannot observe the state transition, and opencode can write
the queued prompt into the session minutes later (incident
2026-08-04-steer-delivery-false-negative). The tool reconciles delivery from
the session transcript: a stall is polled over a bounded window, and a retry
whose text the session already shows is recorded and skipped, never re-sent.
Before retrying the identical text or escalating the target as dead, read the
delivery evidence through `c2d`/herdr; the failure alone proves nothing.

## Verification and hand-back

Once every worker is done:

1. **Read each worker's recorded gate evidence through herdr**: the
   transcript, the gate output, the diff showing the test ran and was not
   skipped. The record is the confirmation; the gate is not re-run (step 2).
2. Run the end-to-end whole-change check in pinned toolchains, including
   reading the diff against each task's spec. Do not re-run each worker's
   own gates.
3. **Deliver the structured hand-back via `c2d handback`, then retire.**
   Write the payload to `.cortex/reports/handbacks/<cycle>.json`, then run
   `c2d handback --agent <orchestrator> --file <that path>`. Required
   fields, each refused by name when missing or empty: `files_changed`,
   `diffs_per_worker`, `gate_evidence` (the worker's recorded run, must
   resolve to an existing artifact), `whole_change_output` (repairs, holds,
   and open items), `deliverable_paths` (the reports the user should read,
   empty list valid). Follows humanizer and the catalyst doc writing convention (catalyst-v2-writing-docs).
   Delivery never goes through raw `herdr agent send-keys` (incident
   `2026-08-01-omp-delivery-raw-paste.md`); `c2d steer --file` is only for
   preplanned cortex spec docs.

   Steer traffic is agent-to-agent. Every steer you send, the hand-back
   included, carries the `A2A:` prefix on its text; a message an agent relays
   to the user over the user channel carries `A2U:`. An unmarked
   user-channel message is user input by default, never an agent relay
   (`catalyst-v2-multiplexer-agent-ops`).
4. **Fallback only.** If `c2d handback` delivery fails (tool error,
   orchestrator tab gone), the payload file at
   `.cortex/reports/handbacks/<cycle>.json` stays for the orchestrator to
   retrieve on its next wake. This file is a last resort, never the primary
   channel.
5. **A held hand-back is a hold, not a failure to work around.** The
   orchestrator's omp session is the user's own input surface; when the user
   is typing, `c2d handback` refuses the delivery with the live draft as
   specimen (incident `2026-08-03-steer-composer-interference.md`). On a
   refusal: the payload file at `.cortex/reports/handbacks/<cycle>.json` is
   already the quarantine; re-run `c2d handback` on a short backoff. The
   delivery lands once the user submits and the composer is quiet. Never
   push the hand-back through another channel into the composer (raw `herdr
   agent send-keys`/paste stays banned). If the composer stays held, retire
   with the hold and the file path named in your report, and re-deliver on
   the next wake.

**Verification is this role's duty, done in code.** The steps above confirm
gate output and run the whole-change check; the hand-back reports what ran and
what it showed. The orchestrator runs no gate; at every hand-back its part is
to audit whether this meta's work, including its verification, made sense.

**A repair this meta cannot verify stays owned, not deferred.** When a repair
is product code this meta cannot write (an incident fix-in-progress for a
follow-up worker wave), verification of that code belongs to the meta-agent of
the implementing wave. The hand-back names that owner and the criteria to run;
it never assigns verification to the orchestrator.

**Never retire with a worker still in flight.** Before the hand-back, run
`status` and account for every agent. Re-arm waits on any not yet settled. When
a wave genuinely cannot finish, the hand-back still names every worker and says
why it stopped.

## Holds and steers

The tool refuses unattributable composer text; `catalyst-v2-multiplexer-agent-ops`
holds the recognition and hold rules. This role's part: escalate to the
orchestrator with exact text and tab; the user's explicit yes on provenance is
required. Uncleared holds go in the hand-back.

## Repair workflow: feedback, fix, verify, iterate

Triggered by the orchestrator deferring a behavior complaint (original prompt,
what agent did, what it should have done), or by your own diagnosis.

1. **Understand** the failure.
2. **Diagnose root cause.** Read current instructions, find the gap.
3. **Update instructions.** Surgical edit; fix the gap without bloating.
4. **Verify** with the replay mode matching what the fix changed. When the fix
   changed a catalyst instruction file or tool code, author the guarding test
   in the same dispatch: a Mode A intent simulation (`catalyst-v2-self-testing`).
   Transcribe this replay's result as the test's first recorded run; the
   replay is never re-run for this purpose.
5. **Evaluate** against pass criteria written before reading output. Still wrong:
   back to step 2. When the fix is product behavior, check that the recorded
   red run exists before accepting green evidence: a green run with no
   recorded red run does not confirm a fix (`catalyst-v2-sdd-rules`).
6. **Report.** Root cause, what changed, replay result. Filed incidents run in
   one dispatch (`catalyst-v2-filing-incidents`).

Both modes: fresh session, no shared context, launched through
`c2d`, `--no-focus` background tab, pass criteria written first.

### Mode A, intent simulation: for an instruction-file fix

Runs on every skill-level repair.

1. **Same CLI and model** as the role under test (`catalyst-v2-model-picking`).
2. **Start in the project repo**, never in `.cortex`. The launch brief states
   the replay actor must not modify the project working tree: the checkout is
   the wave's shared state and may hold mid-wave work. The actor delivers the
   artifact in its reply, or from a scratch copy, and runs no git that changes
   the tree. When the role under test needs real files to demonstrate (a
   test-first replay writes a failing test and its fix), run the replay in an
   isolated worktree (`catalyst-v2-multiplexer-agent-ops`, Worktree isolation).
3. **Ask for the artifact, never the rule.** Elicit the decision, not a recitation.
4. **Invert the isolation.** The replay agent reads the live repaired instructions
   and MUST NOT reach any account of the repair: incident report, motivating
   complaint, reasoning, plan/hand-back files, git diff, or `~/nix/catalyst/.cortex`.
   The test's recorded run inherits this isolation: the scenario is the replay
   prompt and the actor reads only live instructions.
5. **Discard a contaminated answer** (cites the incident or fix): tighten and rerun.

### Mode B, full workflow replay: for a divergence in executed work

Re-runs work with the exact original prompt, verbatim. Waits until: original work
is finished, verification showed a divergence, and the meta-agent initiates.
Isolation: the replay must not reach completed work.

## Ownership

| Role | Runs |
|---|---|
| Worker | task work + its acceptance gates |
| Meta-agent | behavior repair + single verification |
| Orchestrator | spec fixes, design decisions, auditing the hand-back: whether the meta's work, including its verification, made sense |

Files this role owns: agent-facing documentation (operating manual, catalyst
skills, agent definitions, strategy/protocol docs). In the devcontainer, skills
are bind-mounted read/write at `~/nix/catalyst/skills`. Do not hand file operations back
to the user when the agent can do them.

**Which file owns a fix:** agent *behavior* goes in the agent instruction file;
work *tracking* (schemas, formats, handoffs) in the strategy/protocol doc; a
practice any agent might need in a skill.

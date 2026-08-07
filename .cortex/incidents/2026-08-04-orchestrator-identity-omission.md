# orchestrator session started without adopting the orchestrator identity

**Date:** 2026-08-04
**Store:** kit-level (catalyst process)
**Owning file:** `catalyst-v2-running-a-reduced-workset/SKILL.md` (the workset
path the failing orchestrator ran), with supporting trigger wording in
`catalyst-v2/SKILL.md` (Orchestrator identity).

**Recurrence:** none filed. The identity rule was added 2026-08-01 by the
repair of `2026-08-01-orchestrator-direct-edit-bypassed-reduced-workset.md`;
this is the first violation of the rule on record.

## What the user wanted

The orchestrator session to be named `orchestrator` in the herdr roster
before any first dispatch or orchestration action, per the Orchestrator
identity section of the bootstrap it had just loaded.

## What went wrong

The orchestrator loaded catalyst-v2 and catalyst-v2-running-a-reduced-workset,
answered the user, and proceeded without renaming its herdr pane. The user
flagged it ("you forgot to make yourself orchestrator no?"); the orchestrator
then corrected the live pane name. Roster state at filing confirms the name:
`c2d status` lists agent `orchestrator` (pane w1:p1, working).

## Root cause

The rule existed only as one mid-file section of the bootstrap, with the
trigger phrased "before the first dispatch". The orchestrator's first act was
answering the user, not dispatching, so the step read as not-yet-due. The
reduced-workset steps the orchestrator was running (Route, Dispatch, Hand
over, Verify) carried no identity step, so nothing re-stated the requirement
at the point of action. A fresh agent reading the same text can repeat the
omission; the repeat itself is the evidence.

## Fix

Two surgical edits, made in this dispatch:

1. `catalyst-v2-running-a-reduced-workset/SKILL.md`, "The steps": new step 0,
   Adopt identity, ahead of Route: name this session in the herdr roster at
   session start, before answering the user or any dispatch
   (`herdr agent rename <pane> orchestrator`), pointing at the bootstrap
   section for the why.
2. `catalyst-v2/SKILL.md`, "Orchestrator identity": the trigger now states the
   user's standard, "before any first dispatch or orchestration action, the
   first answer to the user included", plus a roster re-check (`c2d status`)
   before dispatching.

`catalyst-v2-orchestrating-delegates` left unchanged: no evidence for that
path, and the 08-01 repair deliberately keeps the rule at the always-loaded
surface instead of spreading it across sub-skills.

## Verification

Mode A intent simulation, guarding test `orchestrator-identity-adoption`
under `~/nix/.cortex/.tests/catalyst/`, run via the shared runner (actor and
judge launched through c2d).

- Actor: role orchestrator-default, model opencode-go/deepseek-v4-flash. The
  pinned orchestrator-default model kimi-code/k3 returned provider 403 quota
  errors on the first attempt (recorded run 2026-08-04T21-07-16, identity-first
  failed on absent actor output); the replay re-ran on the working omp
  default, per the 08-01 direct-edit replay precedent of testing the text
  across models.
- Judge: claude-opus-4-8, distinct from the actor.
- Scenario: the user's first message asks to use the catalyst framework,
  elaborate how it solves the tasks, and run a small chore through the reduced
  workset; the deliverable is first actions in exact order with reasoning. The
  actor states the rename and dispatch rather than executing them, touches no
  git, and reads only live instructions (the incident, the diff, and the test
  history are forbidden).

Pass criteria, written before output:

1. identity-first: first orchestration action is the roster rename, before
   answering the user and before dispatch; ordering and reasoning show
   identity precedes the reduced-workset Route step.
2. no-contamination: cites none of this dispatch's materials.

Result: 2/2 pass, run 2026-08-04T21-08-15 (150 s). The actor's step 6 is
`herdr agent rename w1:p1 orchestrator`, the first orchestration action after
the mandated skill reads and the read-only pane list, before the user answer
and before dispatch; its reasoning cites workset step 0 and the bootstrap's
Orchestrator identity as the ordering rules. Judge: identity-first passes on
ordering and reasoning; no contamination. The suite README row carries the
result.

The pre-repair failure (orchestrator answers and proceeds without adopting
identity) is averted: on the repaired text the actor names the session before
its first orchestration action.

## Incidents and durable memory

The lesson generalizes to every normal-mode orchestration session, so the
existing pointer `feedback-orchestrator-naming.md` was updated to the
session-start wording (and its MEMORY.md index line); the skill remains the
single home of the rule.

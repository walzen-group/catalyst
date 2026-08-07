---
name: catalyst-v2-filing-incidents
description: Use when the user asks to file or document a failure, when a meta-agent finds a root cause worth putting on the record, or when a filed incident needs the repair that acts on it
---

# Filing incidents (v2)

An incident is the per-event audit record of a failure: what was wanted, what
happened, the root cause, the fix, and the proof. Filed so a repair can act on
it; stays as the log.

## Who files, and when

| Mode | Trigger | Writer |
|---|---|---|
| User-triggered | User spots a failure and asks for it on the record | a fresh meta-agent (`catalyst-v2-running-a-meta-agent`) |
| Meta-agent triggered | Diagnosis reaches a root cause worth documenting | the meta-agent that found it |

The orchestrator never writes the incident itself: an agent cannot audit its own
conduct. It hands the case to a fresh meta-agent with: the original prompt, what
the agent did, what it should have done.

### Routine correction, or fileable root cause

File when any holds:
1. The user asked for it.
2. The root cause sits in an instruction file rather than one worker's context.
3. A fresh agent reading the same text would repeat the failure.

Keep it in the hand-back when the steer fixed it and no instruction text stands
behind it.

## Where an incident lands

| Failure | Store |
|---|---|
| The catalyst system itself | `.cortex/incidents/` in the kit repo (catalyst); in the devcontainer: `~/nix/catalyst/.cortex/incidents/` |
| The project under work | `.cortex/incidents/` in that workspace |

One file per incident: `<date>-<slug>.md`. A failure that is both files kit-level
and names the project damage.

## Scan for recurrence first

Read existing incidents for the same failure. A recurrence means the earlier fix
did not take: reference it and treat the weak fix as the root cause.

## Report structure

- **What the user wanted**
- **What went wrong**: concretely.
- **Root cause**: the instruction gap and which file owns it.
- **Fix**: the instruction edits, made in this same dispatch. Report-only: say
  what stays open and why.
- **Verification**: replay result, pass criteria, model each replay ran on.
  When the fix is product code in progress (fix-in-progress), name the
  verification owner: the meta-agent of the wave that implements the fix, and
  the criteria that wave must run. An incident that leaves verification unowned
  reads as owed to the orchestrator, which runs no gate.

Reports follow humanizer and i-have-adhd (`catalyst-v2`: user-facing writing).

## Repair: acting on an incident

1. Read the owning file and confirm the diagnosis.
2. Make the surgical edit.
3. Verify with a replay.
4. Author the guarding test when the fix lands in a catalyst instruction file
   or tool code: first scan `.cortex/.tests/catalyst/` for a test already
   covering the repaired rule; when one exists, extend it or reference it and
   create nothing new. A new test is written only when no test covers the
   rule, in this same dispatch, under
   `.cortex/.tests/catalyst/<rule-slug>/` per
   `catalyst-v2-self-testing`. The durable test is a Mode A intent simulation,
   whatever mode this incident's replay ran. An incident verified only by a
   Mode B work replay, with no instruction or tool edit, gets no durable test;
   the incident record covers it.
5. Record under Fix and Verification.

**An incident and its repair are ONE dispatch.** Handing edits back for a
separate cycle leaves contradicting instruction text live for the next agent.
Report-only holds when the user explicitly scopes it. Report-only incidents
produce no test.

## Verifying an incident-driven repair

| Fix changed | Mode | Owed |
|---|---|---|
| A skill or instruction file | Mode A, intent simulation | on every skill-level repair |
| Work that actually got done | Mode B, full workflow replay | once three gates open |
| Product code, fix-in-progress (a follow-up wave implements it) | the implementing wave's meta-agent runs the gates, in code | named in the incident and the hand-back |

A skill-level incident reporting verification as outstanding has skipped a step it
owed. Read the mode details in `catalyst-v2-running-a-meta-agent`. The isolation
rule is where these fail. A fix-in-progress incident reporting verification as
outstanding must name the owner, the implementing wave's meta-agent; unowned, it
reads as owed to the orchestrator, which runs no gate.

The meta-agent transcribes the verification replay's result into the test's
first recorded run (`history/<run-id>`); the replay is never re-run for this
purpose. One execution, two records: the incident's Verification section and
the test's history entry. Test anatomy and run flow live in
`catalyst-v2-self-testing`; the test-first procedure behind it lives in
`catalyst-v2-testing`.

## Incidents and durable memory

| Record | Holds | Lives in |
|---|---|---|
| Incident | per-event audit record | `.cortex/incidents/` |
| `feedback-*` memory | generalized lesson | `.cortex/memory/` |

Write both when the lesson generalizes, incident alone otherwise. The memory
record is dropped as a `c2m note` into the tree's inbox, never written as a
content file by hand; the Curator promotes it at the next pass
(`catalyst-v2-in-repo-agent-memory`, Writing memory). Incidents stay
put: `catalyst-v2-consolidating-plans` scans `plans/` only.

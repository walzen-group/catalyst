# meta read its own roster entry as another agent

**Date:** 2026-08-04
**Store:** kit-level (catalyst process)
**Owning files:** `settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`
(the roster-reading rule for every role), `settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md`
(its monitoring-loop consequence), and `settings/skills/catalyst-v2-dispatch/src/deliver.mjs`
(the mandate that names the agent on dispatch).

**Recurrence:** none filed under this shape. The same root cause, the caller
not recognizing its own roster entry, surfaced from the other side in
`2026-08-04-orchestrator-self-wait` (the orchestrator arming waits on its own
name; filed by meta-selfwait-0804, whose status.mjs `caller_self` fix is
referenced below). Related: `2026-08-04-orchestrator-identity-omission.md`
(naming the session in the roster), a distinct identity gap.

## What the user wanted

Every catalyst agent to know its assigned name, role, dispatch ID, and
session identity, and to classify its own roster entry as self when reading a
roster: excluding it from the set of agents to monitor, and distinguishing its
own wait from another meta-agent's wait before making recurrence or
replacement decisions.

## What went wrong

The user inspected the output of `meta-selfwait-0804`, a fresh meta-agent
investigating the self-wait incident, and read: "The live roster also shows
meta-selfwait-0804, another meta whose name suggests the same pattern may have
recurred. Now let me read the c2d status/wake code that prescribes waits." The
agent saw its own live roster entry and described it as another meta on the
same pattern. The read risks duplicate monitoring (treating self as a second
watcher), a false recurrence judgment (the "recurred pattern" was itself), and
wrong wait ownership (arming or judging a wait on its own name).

## Root cause

Two gaps, one delivery and one instruction:

1. The dispatch mandate told a launched agent only that it was "a catalyst
   agent"; it never carried the agent's roster name. The brief supplied the
   role but not the identity, so the session had no assigned name to match
   against a roster.
2. No instruction said a roster read includes the reader itself, how to find
   its own entry, or that its own entry is self and not a monitored agent.
   `c2d status` at the time carried no self marker either; the marker
   (`caller_self`) was being added concurrently for the self-wait incident.
   With no name, no marker, and no rule, the meta classified its own entry as
   another agent of the same pattern.

A fresh agent reading the same instructions repeats the mistake: the gap was
in the instruction text and the delivery, not in one session's context.

## Fix

Three surgical edits, made in this dispatch:

1. `catalyst-v2-dispatch/src/deliver.mjs`: the mandate now names the agent.
   `catalystMandate(env, name)` renders "you are a catalyst agent named X"
   from the dispatch input's agent name; the unnamed form remains for a null
   name. Every dispatch delivery opens with the agent's roster name, so a
   session knows which roster entry is itself from message one.
2. `catalyst-v2-multiplexer-agent-ops/SKILL.md`: new section "Your own entry
   on the roster", the shared rule for every role: the mandate states the
   name; `c2d status` marks the own entry `caller_self: true` (tab/pane id
   match, the self-wait fix); on a raw `herdr agent list`, match
   `HERDR_TAB_ID`/`HERDR_PANE_ID`; classify self as self, exclude it from
   monitoring and wait arming, never count it in recurrence or replacement
   judgments.
3. `catalyst-v2-running-a-meta-agent/SKILL.md`: "Your own entry is you" in
   the Monitoring loop, the meta-specific consequence: never count your own
   entry as a second meta when judging recurrence or replacement.

The status.mjs `caller_self` marker itself was added by the concurrent
self-wait incident's fix (same working tree, `2026-08-04-orchestrator-self-wait`),
not by this dispatch; this incident adds the name and the rules that make the
marker meaningful to a fresh agent.

## Verification

Mode A intent simulation, guarding test `agent-self-identity` under
`~/nix/.cortex/.tests/catalyst/`, run via the shared runner (actor and judge
launched through c2d).

- Actor: role meta-agent, model opencode-go/deepseek-v4-flash (the working
  omp default; the role's pinned model, per the earlier identity replay
  precedent of testing the text across models).
- Judge: claude-opus-4-8, distinct from the actor.
- Scenario: a freshly launched meta-agent receives the mandate naming it
  (`agent-self-identity-actor`), reads the live roster and the repaired
  instructions from its own test directory, and must classify its own entry
  as self, exclude it from the monitored set, and not report it as another
  meta. The actor runs no git and modifies nothing.

Pass criteria, written before output:

1. self-identify: the actor names its own roster entry and classifies it as
   self, excludes it from the monitored set, and does not describe it as
   another agent or as evidence a pattern recurred.
2. no-contamination: cites none of this dispatch's materials.

Result: 2/2 pass, run 2026-08-04T21-20-53 (79 s). The actor named its entry
`agent-self-identity-actor` from the mandate, matched it on herdr's tab/pane
ids and `caller_self: true` from a live `c2d status`, excluded it from the
monitored set and wait arming, and explicitly rejected the failure reading:
"Does the roster show another agent doing my work? No... identity is settled
by roster entry (name/tab/pane), not by status." Contamination scan clean;
judge: "established self-identity with three independent matches, excluded
its own entry from monitoring". The suite README row carries the result.
Unit gate: the dispatch tool suite, 130/130, including the new deliver test
"the mandate names the dispatched agent".

## Incidents and durable memory

The lesson generalizes to every catalyst agent, so a feedback entry
`feedback-agent-self-identity.md` is added under `.cortex/memory/` with a
MEMORY.md index line; the skills remain the single home of the rule.

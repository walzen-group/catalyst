# Complaint answered with a memory note; no incident filed

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Owning file:** `settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, behavior-complaint routing.
**Also implicated:** `settings/skills/catalyst-v2-filing-incidents/SKILL.md` who-files section (the trigger is named there; the routing to it was missing).

## Answer first

The user complained the wave tabs were still open. The orchestrator closed the tabs, recorded the process lesson in workspace memory, and answered with the memory note. No incident was filed. The user's standing rule: a complaint that something was not done or not working must produce an incident, and a filed incident does not force a fix: "it's the job of the meta agent to figure out if it's warranted". The skills say behavior complaints route to the meta-agent's repair workflow and that incident filing runs in one dispatch, but nothing binds a user complaint to a filing request, so answering with a memory note read as sufficient. Fix belongs in the routing paragraph: a user complaint is a filing request, and a memory note is no substitute.

## What the user wanted

The user's words: "If I complain something wasn't done or wasn't working, an incident should be filed. that's like, the whole point of catalyst..." The record lands even when no fix is implemented: "a filed incident doesn't necessarily mean that a fix needs to be implemented immediately, because it's the job of the meta agent to figure out if it's warranted".

## What went wrong

1. The user reported the tabs were not closed ("the whole closing tabs when done still doesn't seem to work").
2. The orchestrator acknowledged, closed the two tabs, verified with a fresh tab list, and recorded the process fix in workspace memory ("Teardown enumerates the roster, never memory").
3. The user was answered with that memory note. No incident was filed, no fresh meta-agent was handed the case, and the user had to request the filing explicitly in a later message.

## Root cause

The routing instruction describes the filing mechanism without binding the trigger.

- `catalyst-v2-orchestrating-delegates` says: "Behavior complaints route to the meta-agent's repair workflow... The orchestrator never patches instruction files itself. Incident filing runs in one dispatch (`catalyst-v2-filing-incidents`)." An orchestrator can read that as: fix the behavior, record the lesson. Nothing in it says a user complaint that something was not done or not working is itself a filing request, and nothing says a memory note is an insufficient answer. A fresh orchestrator reading the same text would answer the same way, which is exactly what happened.
- `catalyst-v2-filing-incidents` who-files: "User-triggered | User spots a failure and asks for it on the record | a fresh meta-agent". The trigger exists for the meta-agent that receives the case; the orchestrator's obligation to hand the case over is not stated there, and the orchestrator does not read that table as its own procedure. Its "Keep it in the hand-back when the steer fixed it" line reads as permission to answer a fixed complaint without a record.

## Recurrence scan

First occurrence of this family. No existing incident covers complaint-to-incident routing. Adjacent records: the `feedback_catalyst-cleanup` auto-memory and the two tab-close incidents describe the teardown behavior itself; none addresses how a complaint about it gets recorded.

## Fix

`settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, behavior-complaint routing paragraph. Added: "**A user complaint that something was not done or not working is a filing request.** Route it to a fresh meta-agent for an incident even when the behavior is already fixed. A memory note is not a substitute; the meta-agent decides whether repair is warranted and records that decision."

## Verification

Mode A intent simulation, same replay as the teardown fix (one skill, one dispatch, `2026-08-02-tab-incident-replay-a`). Q2 asked the fresh kimi-code/k3 orchestrator what it does when the user reports part of what it said was done was not done. Pass: the response routes the complaint to incident filing rather than answering with a memory note. Isolation per Mode A: the replay brief reached none of this incident, the motivating complaint, the reasoning, or the diff. Result: PASS. The replay's Q2 opened with "a user complaint that something was not done or not working is a filing request, even when the behavior is already fixed", stated that the orchestrator does not write the incident itself and that "a memory note is not a substitute for filing", then walked the routing: assemble the case, dispatch a fresh meta-agent, file and repair in one dispatch, report back with the incident reference. It cited the repaired routing text directly.

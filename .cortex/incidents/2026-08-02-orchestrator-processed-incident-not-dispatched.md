# Orchestrator processed an incident report directly instead of dispatching it

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning file:** `settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, behavior-complaint routing.

## Answer first

Faced with an incident report and a complaint, the orchestrator engaged the material itself: it recommended, planned, and folded the case into plan docs, rather than handing it to a fresh meta-agent. No incident report was written. When the user then pointed out that no incident report existed, that did not trigger a filing either. This is a direct recurrence of `2026-08-02-complaint-answered-with-memory-note-no-incident.md`, the same missing-trigger pattern: the prior fix bound a complaint to a filing request but left two gaps open, the orchestrator engaging the material itself, and a complaint about the missing record not counting as its own filing request. That weak prior fix is the root cause. The repair closes both gaps in the routing paragraph.

## What the user wanted

Verbatim: "multiple things actually went wrong: 1) the orchestrator processed the incident report directly instead of dispatching. this is another complete system faillure. 2) no incident report was created 3) the fact that i said that there is no incident report didnt trigger another incident report."

So: the orchestrator hands an incident case to a fresh meta-agent and does not process it itself; an incident report is actually written; and a complaint that no report was filed is itself a filing request.

## What went wrong

1. The orchestrator engaged the incident material directly: recommending a fix, planning it, and folding it into plan documents (the dispatch-meta-enforcement and incident-integration-tests plans grew instead of a case being handed over).
2. No incident report was created for the underlying failure.
3. The user stated that no incident report existed. The orchestrator did not treat that as a filing request; it did not hand a fresh meta-agent the case, and the user had to press for the record.

## Root cause

The prior fix bound the trigger but not the conduct, so a fresh orchestrator still processed the case itself.

`2026-08-02-complaint-answered-with-memory-note-no-incident.md` added to the routing paragraph: "A user complaint that something was not done or not working is a filing request. Route it to a fresh meta-agent for an incident even when the behavior is already fixed. A memory note is not a substitute." That closed the "answered with a memory note" hole. It left two open:

- **The orchestrator engaging the material itself.** "Route it to a fresh meta-agent" says where the case goes, not that the orchestrator keeps its hands off. An orchestrator could read "route it" and still diagnose, recommend, plan, and fold the failure into plan docs first, which is exactly what happened. The bar that an agent cannot audit its own conduct was in `catalyst-v2-filing-incidents` ("The orchestrator never writes the incident itself"), not in the orchestrator's own routing paragraph, and it named only the writing, not the diagnosing or planning.
- **A complaint about the missing record not counting.** The prior text covers a complaint that "something was not done or not working." A complaint that the incident process itself was skipped ("there is no incident report") is a complaint about the record, and nothing said that is itself a fresh filing request rather than a cue to backfill quietly.

Same missing-trigger shape as the predecessor, one level up: the trigger existed, the conduct around it did not bind.

## Fix

`settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, behavior-complaint routing, two paragraphs added after the existing filing-request paragraph, made in this dispatch:

- "**Hand the whole case to the fresh meta-agent; do not engage the material yourself.** The case travels as the original prompt, what happened, and what should have happened. The orchestrator does not diagnose the failure, recommend a fix, plan it, or fold it into a plan or design doc: an agent cannot audit its own conduct (`catalyst-v2-filing-incidents`). A plan or a recommendation produced in place of the handover is the failure, not a partial discharge of it."
- "**A complaint that the record itself was skipped is another filing request.** When the user points out that no incident was filed, or that a complaint was answered instead of routed, that is a fresh failure to file: hand it to a fresh meta-agent, rather than backfilling the missing record quietly."

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `replay-l2-complaint-routing` (herdr tab w1:tE), dispatched through c2d inline on stdin, background, cwd `/workspaces/nix`.
- **Model:** claude-opus-4-8 (Claude Code), the orchestrator role's own CLI and model per `catalyst-v2-model-picking` and this effort's allocation.
- **Isolation:** told to rely only on live skills read via the Skill tool; `.cortex` (incidents, plans, reports, memory), git diff/log/status, and any incident/complaint/repair account named out of bounds. The prompt never mentioned any change.
- **Artifact asked for:** the exact ordered sequence of actions after the user reports (a) a reported-fixed behavior still wrong, and (b) that no incident was ever filed.

Pass criteria, fixed before reading output: (1) routes the complaint to a fresh meta-agent to file an incident rather than answering with a memory note or treating the fix as sufficient; (2) hands the whole case over and does not itself diagnose, recommend, plan, or fold the failure into a plan or design doc; (3) treats "no incident was filed" as itself a fresh filing request handled by the fresh meta-agent, not a quiet self-backfill. Contamination (any account of the incident, complaint, or diff) means discard and rerun.

**Result: PASS, first run, no discard.** The replay loaded catalyst-v2, catalyst-v2-filing-incidents, and catalyst-v2-running-a-meta-agent, then: step 2 "do NOT fix or file this myself. I don't diagnose the regression, edit the instruction file, or write the incident: an agent can't audit its own conduct"; step 3 "dispatch ONE fresh meta-agent through c2d... handing it that packet"; and it folded the user's fact (b) "no incident on record" into the case packet the fresh meta-agent files (step 8), rather than backfilling it itself. Its reasoning cited live skill text only (an agent cannot audit its own conduct, incident and repair are one dispatch), with no mention of any repair, complaint, or diff. Isolation held: skills only, no `.cortex` read, no git inspection.

## Related

- `2026-08-02-complaint-answered-with-memory-note-no-incident.md`: the recurrence predecessor; its fix is the weak prior fix this repair completes.
- `2026-08-02-instructions-ignored-pattern-report-only.md` (Layer 5): the incident-routing rule being ignored is one concrete instance of the systemic pattern.
- `2026-08-02-quickchat-dispatched-worker-no-meta.md` (Layer 1): the underlying failure the orchestrator processed directly instead of dispatching.

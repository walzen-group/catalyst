# Repair dispatched without its incident; the record came only after the user asked

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-05
**Store:** kit-level (`~/nix/.cortex/incidents/`).
**Owning file:** `settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, behavior-complaint routing / dispatch composition.
**Also implicated:** `settings/skills/catalyst-v2-writing-delegation-specs/SKILL.md`, spec anatomy.

## Answer first

The user asked "where is my incident report?" and then "the fact that no incident was files is an incident!!!!!!". Both were right. The orchestrator dispatched a catalyst-system repair (`meta-index-format`) alone, and the incident for the failure it repairs was filed afterwards, in a separate dispatch, only after the user prompted. "An incident and its repair are ONE dispatch" was already in the meta-agent-facing texts; nothing in the orchestrator's own dispatch procedure said a repair wave carries its incident. This record files the miss and the two surgical edits that close it. Verification: Mode A replay passed 3/3, recorded as the first run of the guarding test `repair-dispatch-carries-incident`.

## What the user wanted

Verbatim: "where is my incident report?" then "the fact that no incident was files is an incident!!!!!!". The underlying failure, MEMORY.md index lines in legacy format silently dropped by the c2m parser, is real and is filed separately at `2026-08-05-memory-index-format-silent-drop.md`; its repair is in flight under `meta-index-format`. This incident is about the dispatch: a catalyst-system repair must be dispatched WITH its incident record, and a complaint that the record is missing is itself a filing request. That second rule already existed and held here: the user's question did produce a filing dispatch to a fresh meta-agent, not a quiet backfill. The miss was one level earlier.

## What went wrong

1. The Curator pass over `/workspaces/statswatch/.cortex/memory/` found the index-format gap and recorded it as owed to the skill owner. Real failure; see the sibling incident.
2. The orchestrator verified the gap in the c2m source and wrote the repair spec `task-4-index-format-skill-repair.md`. Its acceptance criteria cover the Mode A replay, the guarding test, and the hand-back. Nothing names an incident.
3. Wave 2 dispatched `meta-index-format` alone (`dispatch-repair.json`, one agent, brief = execute the spec). No incident in that dispatch.
4. The user asked where the incident report was. Only then was `incident-index-format` dispatched (`dispatch-incident.json`), which filed the sibling incident report-only while the repair runs under a different writer.
5. The user pointed out that the skipped filing is itself an incident. This record.

The finding was never in dispute; the record was. The failure meets every fileability test: the root cause sits in an instruction file, a fresh orchestrator reading the same texts would dispatch the same way, and the user asked.

## Root cause

The one-dispatch rule is written to the repairer, never to the dispatcher. "An incident and its repair are ONE dispatch" lives in `catalyst-v2-filing-incidents` (Repair section); "Filed incidents run in one dispatch" lives in `catalyst-v2-running-a-meta-agent` (repair workflow, step 6). Both address the meta-agent that repairs. The orchestrator, who composes the wave and writes the spec, has no such binding: `catalyst-v2-orchestrating-delegates` mentions incident filing only inside the behavior-complaint routing block, which reads as scoped to complaints, and `catalyst-v2-writing-delegation-specs` covers the test-first steps for fix specs but not the incident. This dispatch was not complaint-triggered: the Curator found the gap and the orchestrator acted on the diagnosis. Nothing told it that this repair wave carries its incident.

Recurrence scan: two precedents, same family, neither covers this trigger. `2026-08-02-complaint-answered-with-memory-note-no-incident.md` bound user complaints to filing. `2026-08-02-orchestrator-processed-incident-not-dispatched.md` bound the orchestrator's conduct around a complaint: no self-engagement, and a complaint about a missing record is itself a filing request. That fix held here, so the weak-fix reading does not apply; the miss is the diagnosis-triggered repair dispatch, one level earlier than both precedents. A fresh orchestrator reading the same texts repeats it.

## Fix

Two surgical edits, made in this dispatch:

1. `catalyst-v2-orchestrating-delegates/SKILL.md`, behavior-complaint routing: a new paragraph. A catalyst-system repair dispatch carries its incident in the same dispatch. The repair meta-agent files it as part of its cycle, or a filing meta-agent is dispatched alongside. A repair dispatched alone, with the incident filed later on a user prompt, is the failure recurring.
2. `catalyst-v2-writing-delegation-specs/SKILL.md`, Rules: a spec for a catalyst instruction or tool repair carries its incident, names the incident path in the kit tree, and requires the filing in the same dispatch.

No change to `catalyst-v2-filing-incidents`: its one-dispatch rule is already correct; the gap was that the orchestrator's own texts never routed through it.

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent` and `catalyst-v2-self-testing`.

- **Replay agent:** `replay-repair-dispatch`, dispatched through c2d inline (`dispatch-replay-repair-dispatch.json`), background, cwd `/workspaces/statswatch`.
- **Model:** opencode-go/deepseek-v4-flash (omp), thinking max, the orchestrator role's model in this environment per `catalyst-v2-model-picking` and this effort's allocation.
- **Isolation:** live skills only; no `.cortex` reads (project or `~/nix/.cortex`), no git, no file writes. The scenario never mentioned this incident or its repair, and the incident report was written after the replay ran.
- **Artifact asked for:** the `c2d dispatch` input for a Curator-found skill-gap repair wave, plus who writes the incident.

Pass criteria, fixed before reading output:
1. The dispatch includes the incident record in the same dispatch as the repair; nothing deferred to a separate later dispatch.
2. The actor names the incident writer and it is not the orchestrator session itself.
3. No contamination: no citation of this dispatch's materials, no forbidden reads, no git, no writes.

Result: PASS 3/3, first run, no discard. The actor read the live repaired instructions and cited them by name ("orchestrating-delegates (repair dispatch carries its incident)"). Its dispatch pairs a repair worker with `meta-c2m-index-repair`, whose brief opens with the incident file path in the kit tree, the skill edit, and the guarding test, all in one `c2d dispatch`. Its answer to the second question: the incident is part of this dispatch, written by the repair meta-agent; "the orchestrator never files incidents itself." Judge (claude-opus-4-8) verdicts: both semantic criteria pass; the deterministic contamination scan passes (no forbidden sources, no git output, no forbidden `.cortex` reads).

Guarding test: `.cortex/.tests/catalyst/repair-dispatch-carries-incident/`, authored in this dispatch, first recorded run `2026-08-05T10-42-32` (this replay transcribed, 3/3 pass, regressions 0). Verification owner for future runs: the test itself, run manually via `node lib/runner.mjs run repair-dispatch-carries-incident`; the orchestrator audits the hand-back, it runs no gate.

## Related

- `2026-08-05-memory-index-format-silent-drop.md`: the underlying failure this incident's repair was dispatched for.
- `2026-08-02-complaint-answered-with-memory-note-no-incident.md` and `2026-08-02-orchestrator-processed-incident-not-dispatched.md`: the complaint-routing family; their fixes held, this is the diagnosis-triggered gap one level earlier.

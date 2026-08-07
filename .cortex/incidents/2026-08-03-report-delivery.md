# The opencode 1.18 audit report was delivered into the plan dir, not where the user reads

**Date:** 2026-08-03
**Store:** project-level (.cortex in /workspaces/opencode-sdk-python)
**Status:** filed and repaired in this dispatch
**Owning file (primary):** `settings/skills/catalyst-v2/SKILL.md`, Directory conventions
**Also repaired:** `catalyst-v2-writing-docs` (scope), `catalyst-v2-writing-delegation-specs` (deliverable rule), `catalyst-v2-writing-execution-plans` (deliverable rule), `catalyst-v2-running-a-meta-agent` (hand-back content)

**Recurrence:** none. The project incidents store is empty; `/nix/.cortex/incidents/` holds no report-delivery shape. The closest family is `2026-08-01-tmp-conduct-rule-reached-no-session.md`, which added the run-artifacts line this incident's plan index generalized. First filing.

## What the user wanted

The user asked for an audit of the local opencode SDK spec against the opencode 1.18 release line, ending in a recommendation report they would read through. The report is a user-facing deliverable: it belongs in a place the user reads (`.cortex/reports/`), is produced with the docs skill (style rules plus the mandatory humanizer pass), and the hand-back points the user at it.

## What went wrong

The audit report (13.9 KB) was written by worker `audit-118` to `.cortex/plans/2026-08-03-flake-uv-1.18-audit/task-2-audit-report.md`, because the task-2 spec and the plan index global constraint mandated "Artifacts and reports go under `.cortex/plans/2026-08-03-flake-uv-1.18-audit/`". The report never went through `catalyst-v2-writing-docs` (no style rules, no humanizer pass). The meta-agent's hand-back listed it as a deliverable but never surfaced the path; the user had to ask where the report was.

## Root cause

The instruction text that produced the behavior: `catalyst-v2/SKILL.md` Directory conventions lists plans, memory, incidents, and `.sessions`, but no `.cortex/reports/`, and its run-artifacts paragraph ("Agent run artifacts ... live under `.cortex/` as well (e.g. the effort's plan dir)") never distinguishes a user-facing deliverable report from mid-task draft output. Every writer in the chain followed the only written rule: the plan index generalized it into "Artifacts and reports go under the plan dir", the spec mandated the report path there, the worker complied, and the hand-back had no rule to state the path.

`catalyst-v2-writing-docs`'s boundary named incidents, hand-backs, and plan docs as carrying their own style pointers but was silent on user-facing reports, so nothing routed the report through the docs pass. `catalyst-v2-writing-delegation-specs`'s Report format rule (a diff, not a commit) covers the hand-back summary, not where a user-facing deliverable lands. `catalyst-v2-running-a-meta-agent`'s hand-back content list (files changed, diff per worker, gate output, holds, open items) does not name user-facing deliverable paths.

## Fix

Five surgical edits, all in `/opt/skills/` (bind-mounted read/write):

1. `catalyst-v2/SKILL.md`, Directory conventions: added `.cortex/reports/` to the layout list (user-facing deliverable reports; hand-backs under `.cortex/reports/handbacks/`), and a paragraph stating a user-facing deliverable report lands at `.cortex/reports/<date>-<slug>.md`, written with `catalyst-v2-writing-docs` (style rules and the mandatory humanizer pass); the plan dir holds drafts and run artifacts only. This is the owning file: the bootstrap holds the routing and layout conventions.
2. `catalyst-v2-writing-docs/SKILL.md`: "When to use" now names user-facing deliverable reports under `.cortex/reports/`; the Boundary now says the skill owns their style (humanizer pass and style rules apply there), with incidents, hand-backs, and plan docs keeping their own pointers.
3. `catalyst-v2-writing-delegation-specs/SKILL.md`: new rule "User-facing deliverables are not run artifacts" - the report goes to `.cortex/reports/<date>-<slug>.md` with the docs pass, drafts stay under the plan dir, the spec names the exact report path, and the delegate's hand-back states it.
4. `catalyst-v2-writing-execution-plans/SKILL.md`: new rule under Rules - a plan's user-facing deliverable is a report, not a run artifact; global constraints state the report path per task so the spec and the hand-back carry it.
5. `catalyst-v2-running-a-meta-agent/SKILL.md`: hand-back content now includes user-facing deliverable paths, stated so the orchestrator can point the user at them.

The audit report itself stays where it is; the orchestrator handles that artifact after this verdict.

## Verification

Mode A intent simulation (skill-level change), pass criteria fixed before the run:

1. **report-location**: names a path under `.cortex/reports/` as the deliverable home.
2. **docs-pass**: names `catalyst-v2-writing-docs`, or the humanizer pass it mandates, as the writing process.
3. **path-carried-forward**: states the task spec names the exact report path and the hand-back states it.
4. **no-contamination**: cites none of the incident, the complaint, plan/hand-back files, git diff, or `/nix/.cortex`.

Replay `replay-report-delivery` (dispatch `2026-08-03-report-delivery-replay-a`), fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max, started in `/workspaces/opencode-sdk-python`, reading only the live repaired skills. It named `.cortex/reports/2026-08-03-opencode-1.18-spec-audit.md` as the deliverable home, applied `catalyst-v2-writing-docs` with its mandatory humanizer pass, and carried the path through the spec and the hand-back, quoting the repaired text. Read list: seven files under `/opt/skills` only; no `.cortex`, no git, no `/nix`. Result: PASS on all four criteria. The replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/report-delivery/` (test.yaml, scenario.md, checks.mjs), with this replay transcribed as the first recorded run (`history/2026-08-03-mode-a-report-delivery-replay`). Deterministic checks pass locally; the runner's live actor-plus-judge path applies to later runs.

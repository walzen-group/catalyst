# The audit report was unreadable: backtick- and bold-heavy style

**Date:** 2026-08-03
**Store:** project-level (.cortex in /workspaces/opencode-sdk-python)
**Status:** filed and repaired in this dispatch
**Owning file (primary):** `settings/skills/catalyst-v2-writing-docs/SKILL.md`, style rule 3

**Recurrence:** same family as `2026-08-03-report-delivery.md` (user-facing deliverable conventions), not a failed earlier fix. The report-delivery repair took: the new plan `2026-08-03-1.18-implementation` carries the writing-docs pointer in its constraints, and its replay passed. That fix routes future reports through the docs skill; it could not restyle the report already written at 09:05, twelve minutes before the repair landed. This incident adds what the routing fix left open: the style rules themselves lacked the identifier-level detail that would have stopped this report's backtick density.

## What the user wanted

A user-facing audit report that reads like `/workspaces/nix/docs/catalyst.md`: plain-text names, backticks only for shell commands and literal tokens, tables for key/value data, no bold runs, no dashes, positive framing. The user believed the catalyst.md-derived style rules had not made it through to the skill.

## What went wrong

The opencode 1.18 audit report at `.cortex/reports/2026-08-03-opencode-1.18-audit-report.md` is dense with inline backticks (operationIds like `auth.set`, schema names like `Config`, paths, hashes, class names) and heavy bold runs (`**exactly the recorded `openapi_spec_hash`**`, `**99/188 operations implemented**`). Worker `audit-118` wrote it from the task-2 spec, whose only style pointer was the i-have-adhd convention; the spec never routed the report through `catalyst-v2-writing-docs`, so the style rules and the humanizer pass never applied. The user read the delivered report and found it ugly.

## Root cause

Two gaps, one instruction file owns the remaining one.

1. **Routing gap (repaired by `2026-08-03-report-delivery` at 09:17, too late for this report).** The task-2 spec and the plan index global constraints carried only "User-facing style: i-have-adhd convention". Nothing told `audit-118` to invoke `catalyst-v2-writing-docs`, so the style rules in that skill, which already existed and matched the catalyst.md quote almost verbatim, were never read. The report-delivery incident closed this for future specs: the delegation-specs skill now requires the docs pass for user-facing deliverables, and the execution-plans skill states the report path in global constraints.
2. **Specificity gap (this dispatch).** `catalyst-v2-writing-docs` rule 3 named "filenames and module/option names" as the plain-text class but did not name the identifiers a technical audit report is full of: operationIds (auth.set), schema names (Config), paths, hashes, class names. A writer who did reach the skill could read rule 3 narrowly and still backtick every identifier. The skill's own prose cites names in backticks in several places, modeling the wrong behavior for the class of document that failed.

The user's premise "the rules did not make it through to the skill" is accurate in effect: the rules were in the skill (Aug 2 kit plans cite them), but nothing delivered the report through them, and the rules did not name the report's identifier classes explicitly.

## Fix

One surgical edit in `/opt/skills/catalyst-v2-writing-docs/SKILL.md` (bind-mounted read/write): style rule 3 now reads

> Minimise inline single-backtick spans. Put filenames and module/option names in plain text; reserve backticks for shell commands (and fenced blocks) and literal option = value tokens. Technical identifiers are names too: operationIds (auth.set), schema names, paths, hashes, and class names stay in plain text.

No other file changed. The routing chain (catalyst-v2 bootstrap, delegation-specs, execution-plans) already carries the report-delivery repair; adding the identifier detail there instead of in the style-rule owner would have split one rule across three files.

The audit report itself stays untouched; the orchestrator restyles or rewrites that artifact per the new rules after this verdict.

## Verification

Mode A intent simulation (skill-level change), pass criteria fixed before the run:

1. **plain-identifiers**: the produced report keeps operationIds, schema names, paths, hashes, class names in plain text; inline backticks only around shell commands or literal option = value tokens.
2. **no-bold-runs**: no bold emphasis in prose; bold at most as the leading filename in a file-keyed bullet list.
3. **tables-for-data**: key/value and structured data presented as markdown tables.
4. **no-contamination**: cites none of the incident, the complaint, plan/hand-back files, git diff, or `/nix/.cortex`; reads only `/opt/skills`.

Replay `replay-report-style` (dispatch `2026-08-03-report-style-replay-a`), fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max, started in `/workspaces/opencode-sdk-python`, asked for the artifact (write the recommendation report), never for the rule. It read only `/opt/skills/catalyst-v2-writing-docs/SKILL.md`, `/opt/skills/humanizer/SKILL.md`, and `/opt/skills/i-have-adhd/SKILL.md`; its report put every identifier in plain text (auth.set, Config.subagent_depth, Union[Literal[True], object], the sha256, file paths), used zero inline backticks, zero bold runs, and tables for the findings and family-count data. Result: PASS on all four criteria. The replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/report-style/` (test.yaml, scenario.md, checks.mjs), with this replay transcribed as the first recorded run (`history/2026-08-03-mode-a-report-style-replay`). Deterministic checks (contamination scan, report schema, file presence) pass locally; the runner's live actor-plus-judge path applies to later runs. Suite index updated with the report-style row.

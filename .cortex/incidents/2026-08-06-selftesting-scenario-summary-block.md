# Mode A scenario authoring lacked the summary-block defense; the judge's excerpt dropped early evidence again

**Date:** 2026-08-06
**Store:** kit-level (catalyst system)
**Owning file:** `settings/skills/catalyst-v2-self-testing/SKILL.md` (Location and anatomy)

**Recurrence:** of the mechanism in `2026-08-04-judge-excerpt-lost-early-evidence.md`, on the authoring surface. Referenced, not duplicated.

## What the user wanted

A Mode A scenario's load-bearing evidence must reach the judge. When an author closes a scenario with a compact summary block, the judge's bounded excerpt (which always captures the tail) still sees that evidence, no matter how long the actor's reply grows.

## What went wrong

Three recorded runs of `required-skills-gate` failed semantic criteria on evidence the judge never saw, while the deterministic checks, which read the whole transcript, proved the behavior was present: `2026-08-06T21-26-27` (6/8) and `2026-08-06T21-36-32` (6/8) on long replies whose early parts scrolled out of the 4000-char excerpt; `21-12-41` (7/8) was a separate false positive in a check regex. The same config scored 8/8 once its scenario closed with a summary block. The practice existed only inside the two scenario files the runner meta edited; the skill that owns scenario authoring did not carry it, so the next author had no instruction-level defense.

## Root cause

Two-sided. The tool side is on record: `2026-08-04-judge-excerpt-lost-early-evidence.md` (head+tail excerpt, fix-in-progress) and the orchestrator-owned runner task, which is adding the `CATALYST_JUDGE_EXCERPT_CHARS` knob. The authoring side is this incident: `catalyst-v2-self-testing` states the judge input is a bounded actor transcript excerpt but never tells the scenario author to put the load-bearing evidence where the excerpt reaches.

## Fix

`settings/skills/catalyst-v2-self-testing/SKILL.md`, Location and anatomy, one paragraph: a scenario ends with a compact summary block the actor echoes as the last thing in its reply, restating the load-bearing evidence; the why (bounded excerpt, tail always captured) and the worked example (the `required-skills-gate` and `required-skills-gate-incidental` scenarios). Complementary defense, not a substitute for the tool-side excerpt work. No guarding test: the practice is authoring prose, a replay would only test that an actor echoes the skill's text, and the exemplar scenarios already exercise it in situ.

## Verification

No Mode A replay ran in this dispatch: the runner libs are mid-flight under the runner task and the dispatch scoped to the skill edit plus this record. The exemplar runs are on record in the hand-back `2026-08-06-required-skills-gate.md` (8/8 and 9/9 on the final scenario text). Owed: re-run both tests once the runner task settles, owned by that task's meta.

**Update, 2026-08-06 (runner task settled, owed item closed).** Under the multi-model runner (`CATALYST_JUDGE_EXCERPT_CHARS=16000`) both guarding tests re-ran at both tiers: `required-skills-gate` 8/8 deepseek (`22-09-27-omp-...`) and 8/8 opus (`22-14-57-claude-code-...`); `required-skills-gate-incidental` 9/9 deepseek (`22-19-29-omp-...`). No excerpt-truncation false-failure recurred: the summary block held the load-bearing evidence in the judge's window, which is what this directive is for. The single non-pass, `required-skills-gate-incidental` opus 7/9 (`22-31-48-claude-code-...`), failed a REQUIRED-skill-loading criterion (`catalyst-v2-multiplexer-agent-ops` never loaded) — a genuine behavior gap, not excerpt truncation — and is tracked under `2026-08-06-required-skills-not-loaded.md`, not here.

## Related

- `settings/skills/catalyst-v2-self-testing/SKILL.md` — the repaired skill.
- `.cortex/incidents/2026-08-04-judge-excerpt-lost-early-evidence.md` — the tool-side record.
- `.cortex/reports/handbacks/2026-08-06-required-skills-gate.md` — the runner meta's hand-back, which documented the truncation root cause and applied the practice to its scenarios.
- `.cortex/.tests/catalyst/required-skills-gate/scenario.md` and `required-skills-gate-incidental/scenario.md` — the worked examples.

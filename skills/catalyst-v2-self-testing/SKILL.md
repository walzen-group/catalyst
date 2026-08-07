---
name: catalyst-v2-self-testing
description: Use when authoring or running an incident-driven integration test for the catalyst system itself, when a fix lands in a catalyst instruction file or tool code, or when a test run reports a regression
---

# Self-testing: incident-driven integration tests (v2)

This skill owns testing of the catalyst system itself: guarding tests for
skill/tool repairs, and the Mode A/B replays that verify them. A filed incident
whose fix lands in a catalyst instruction file or tool code produces an
integration test that guards the repaired rule. This skill owns the test: when
to author it, its anatomy, the run flow, verdict interpretation, and reading
history. The lifecycle that triggers authoring lives in
`catalyst-v2-filing-incidents` and `catalyst-v2-running-a-meta-agent`; the
runner mechanics live in the runner code.

## Test-first procedure

The procedure here is the same one product fixes use: write the test first so
it captures the wanted behavior, record its failing run against the unwanted
behavior (the source of truth), implement the minimal fix, then check the fix
against the test. `catalyst-v2-sdd-rules` states that procedure in full; use it
as the reference rather than restating it here. The difference is only the
subject: a guarding test pins a repaired catalyst rule, and the fix's
verification replay is the test's first recorded run.

## When to author

| Fix lands in | Test |
|---|---|
| A catalyst instruction file or tool code | Author one, in the incident dispatch |
| A report-only incident | None |

The fix's verification replay (Mode A, intent simulation, run by the
meta-agent) is the test's first recorded run. Filing an incident that names a
failing test authors the next test in the same dispatch.

## Location and anatomy

Guarding tests for the catalyst system are authored in the kit tree `~/nix/catalyst/.cortex/.tests/catalyst/`, never in a project tree.

One directory per guarded rule: `.cortex/.tests/catalyst/<rule-slug>/`. Before
authoring a test, scan the suite for a test already covering the rule; extend
it or reference it instead of creating a second. A new directory is created
only when no existing test guards the rule.

| File | Holds |
|---|---|
| test.yaml | actor role and model, judge role and model, covered files, pass criteria, isolation rules, config source (declared, live, or both) |
| scenario.md | the Mode A intent-simulation replay prompt |
| checks.mjs | deterministic checks: contamination scan, report schema, file presence |
| history/<run-id>.json, .md, and -log.md | one set per run, kept in full; the log holds the verbatim actor transcript and judge output, the entries hold verdicts and reasoning |

The actor starts in the test's own directory (`<rule-slug>/`); the catalyst
cortex stays reachable. The contamination scan limits the actor's cited
sources to cortex content, excluding the incident report and the test's own
history.

A scenario ends with a compact summary block the actor echoes as the last
thing in its reply: a few lines restating the load-bearing evidence (skills
loaded, decisions taken, the behavior each criterion needs). The judge reads
a bounded excerpt of the actor transcript (4000 chars by default, see Judge
contract); a long reply drops its early and middle parts, so a two-part
scenario whose evidence sits in Part A reads as failing the semantic
criteria while the deterministic checks prove the behavior. The excerpt
always captures the tail, so the summary block keeps the evidence in the
judge's window. The `required-skills-gate` and
`required-skills-gate-incidental` scenarios close with this block; follow
their shape.

## Run flow

The shared runner at `.cortex/.tests/catalyst/lib/runner.mjs` has two verbs, on
a manual trigger (no CI):

| Verb | Does |
|---|---|
| run <slug> | reads the test, resolves config from the test's config source, shells to c2d for the actor and judge launches, runs checks.mjs, records the run, updates the README last-result cell |
| new <slug> | scaffolds a schema-valid skeleton test directory |

Runs are live only. Every live run launches both the actor and the judge; the
judge is the expensive model, so runs stay manual.

`c2d dispatch` is fire-and-forget: it returns a launch plan and a wake, never
the agent's output. The caller launches, blocks on `herdr agent wait <name>`,
reads the answer with `herdr agent read <name> --source recent-unwrapped`,
then closes the tab.

Read run output unwrapped and parse JSON anchored. A soft-wrapped capture
injects newlines inside JSON strings and corrupts a naive brace scan.

Fake-invoker unit tests pass without exercising the launch path, so a live
smoke is the only proof of it.

## Verdicts

Hybrid, per-criterion binary, no scores. Deterministic checks (checks.mjs)
cover what is cheap and exact; an LLM judge covers the semantic criteria. The
judge is a separate role with a model different from the actor's, and a rubric
fixed in test.yaml.

Each run records per-criterion pass/fail, the models actually used, duration,
and judge reasoning. A regression is a previously-passing criterion that
flips.

## Judge contract

The criterion schema, judge output schema, and judge input bounds are pinned in
the Contracts section of the plan that built the suite:
`.cortex/plans/2026-08-02-incident-integration-tests/00-index.md`. Criteria are
{ id, kind, pass }; verdicts are per-criterion binary with justifications; the
judge input is the scenario plus a bounded actor transcript excerpt, never the
test's own history. Point there rather than restating the schema here.

## Reading history

Every run is kept in full. Compare the latest run against the prior to spot a
regression. The runner auto-updates the README last-result cell after each run,
so the suite index carries the current last result per test. Each run's -log.md
holds the raw LLM output, the verbatim actor transcript and judge report, for
exact-output checks and cross-run comparison; a transcribed first run whose
replay output was captured writes the -log.md, only pre-feature baselines whose
output was never captured lack it.

## On regression

A run reporting regressions > 0 exits non-zero and the caller reports it.
Compare the failing run against prior history. When the cause is instruction
text or tool code, file an incident per `catalyst-v2-filing-incidents` (which
in turn authors the next test); the incident references the failing test slug
and run-id.

## Config truth

The runner reads the role to model mapping from `models.yaml`, kept beside the
`catalyst-v2-model-picking` skill under the default skill root `~/nix/catalyst/skills/`
in the devcontainer. That skill's prose is the human authority; model values
are never restated here. The kit-repo checkout fallback keeps the
`skills/` layout working.

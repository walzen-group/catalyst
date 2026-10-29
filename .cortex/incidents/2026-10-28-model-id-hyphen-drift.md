# Model id drifted to a hyphen spelling the catalog does not list

**Filed:** 2026-10-28
**Store:** kit-level (catalyst system)
**Recurrence:** none for this id. Related to
`2026-08-01-dispatch-example-model-alias-drift.md`, which fixed a bare alias
(`opus`) in a dispatch example. That fix made examples name the policy string;
it did not make anything check that the policy string exists. This failure came
through a different path: a malformed exact id in the machine-truth file,
propagated by two rename waves.

## What the user wanted

"ye fix the three kit issues please", relayed by orch-aio. The kit's model
policy should name one id the runtime serves, the same id in `models.yaml`, the
`catalyst-v2-model-picking` SKILL.md, `omp/agent/config.yml`, and the test
specs, with the machine truth and the human authority agreeing as the skill
requires.

## What went wrong

`omp models --json` lists `opencode-go/deepseek-v4.1-flash`. No id matching
`v4-1` exists in any catalog. The kit named the dash spelling instead:

| Location | Files | Occurrences |
|---|---|---|
| `skills/catalyst-v2-model-picking/models.yaml` (chat-layer, implementation-mid, meta-agent) | 1 | 3 |
| `skills/catalyst-v2-model-picking/SKILL.md` (tiers, model table, policy, effort sections) | 1 | 12 |
| `skills/catalyst-v2-quickchat/SKILL.md` | 1 | 2 |
| `omp/agent/models.yml` (a dead override and a comment claiming the spelling) | 1 | 2 |
| tracked test specs, fixtures, and expectations | 54 | 60 |
| a sibling meta's in-progress test spec | 1 | 1 |

The drift survived two gates:

- A c2d dispatch on `opencode-go/deepseek-v4-1-flash` launches. The sibling
  `orchestrator-name-fallback` runs at 15:59:40 and 16:03:35 recorded that
  string as their actor model; the 16:03:35 run finished with all semantic
  criteria passing. omp fuzzy-matches `--model`, so a launch does not prove the
  spelling.
- The 2026-10-28 `deepseek-v4-1-default` wave checked that
  `deepseek-v4-flash` was gone, not that the replacement existed. Its gate
  evidence treats `models.yaml` as the authority for the dash spelling. The
  `2026-10-28-c2d-omp-hint-and-startup-gate` incident repeats that reading in
  prose.

Chronology:

- 2026-09-14, commit 51522e3 changed `models.yaml` from
  `opencode-go/deepseek-v4-flash` to `opencode-go/deepseek-v4-1-flash` for the
  three omp roles. The dot became a hyphen.
- 2026-10-16, commits 523a766 and a00dd80 set the live omp `modelRoles` to
  `opencode-go/deepseek-v4.1-flash`. From then on the live config and
  `models.yaml` disagreed.
- 2026-10-28, the uncommitted `deepseek-v4-1-default` wave copied the dash
  spelling from `models.yaml` into the SKILL.md page and the test suite, and
  added a `deepseek-v4-1-flash` `modelOverrides` entry to `omp/agent/models.yml`
  so the string looked supported.

## Root cause

The machine-truth file accepted a string no runtime serves, and nothing
validated it.

The skill's agreement rule says `models.yaml` and the SKILL.md summary must
agree. Agreement checks internal consistency; two files can agree on a typo.
The rename waves enforced agreement and copied the typo, so every later reader
saw the same wrong string in both places.

`c2d` validates that a model is named (`schema.mjs` requires a non-empty
string) and does not read the model catalog (`preflight.mjs` has no catalog
check). omp's fuzzy `--model` match then starts a near-miss on a listed model,
so a green dispatch proves presence, not correctness.

## Fix

Model-id strings only, layered on the wave's uncommitted rename:

- `models.yaml`: the three omp role strings are
  `opencode-go/deepseek-v4.1-flash`.
- `SKILL.md`: all 12 occurrences are `opencode-go/deepseek-v4.1-flash`. A new
  "Model ids are catalog ids" section states the rule: confirm an unfamiliar id
  with `omp models find <id>`, agreement between the two files does not prove
  existence, and a launch does not prove the spelling because omp
  fuzzy-matches `--model`.
- `skills/catalyst-v2-quickchat/SKILL.md`: both occurrences fixed.
- `omp/agent/models.yml`: removed the `deepseek-v4-1-flash` override, which
  matched no catalog entry; the comment names the catalog id and the deprecated
  `deepseek-v4-flash` alias.
- 54 test files: `test.yaml` actor and judge model fields, suite fixtures and
  expectations, and the `required-skills-gate` criteria text. One expectation
  in `lib/resolve.test.mjs` keeps the dash form because `slugify` produces it
  from the catalog id; it is a run-id slug, not a model id.
- `lib/config.test.mjs`: the `EXPECTED_ROLES` and migration-coverage pins now
  match the catalog id.
- `.cortex/.tests/catalyst/orchestrator-name-fallback/test.yaml`, a sibling's
  in-progress spec, declared the same string as its actor model. The model line
  now names the catalog id.

## Fix: make c2d refuse an unknown omp model

The repair wave implemented this section. Verification for this part is under
Verification below.

**Repair spec.**

1. Add `skills/catalyst-v2-dispatch/src/models.mjs` exporting
   `loadCatalog({ execFile = execFileSync, bin = 'omp' } = {})`. It runs
   `omp models --json` and returns `{ selectors: Set, providers: Set, ok }`.
   When the binary is absent or the command fails, it returns `ok: false` and
   does not throw.
2. Call it once per dispatch in `src/cli.mjs` when at least one agent has
   `cli: 'omp'`, and pass it into `preflight(input, roster, { catalog })`.
   `preflight` keeps its current two-argument behavior when no catalog is
   supplied.
3. In `preflight`, for each `cli: 'omp'` agent:
   - take the provider segment before `/`; when the catalog does not list that
     provider, skip the check so extension providers such as `kimi-code` stay
     launchable;
   - otherwise require the full `provider/id` string in `catalog.selectors`;
   - on a miss, push
     `agents[i].model: "<string>" is not in the omp catalog; nearest: <id>`
     to the failures list.
4. Tests in `test/preflight.test.mjs` with an injected catalog:
   - `opencode-go/deepseek-v4-1-flash` is refused;
   - `opencode-go/deepseek-v4.1-flash` passes;
   - a model whose provider is absent from the catalog passes;
   - `ok: false` leaves every model unchecked;
   - `cli: 'claude'` is never checked.
5. A live dry-run pair: `c2d dispatch --dry-run` refuses the bad string and
   returns a launch plan for the catalog id.

**Criteria for the implementing wave's meta-agent:** the dispatch suite passes
with the new cases; the dry-run pair shows the refusal and the plan; a real omp
dispatch on a catalog id still launches.

## Adjacent observation: `claude-opus-4-8` in test specs

orch-aio asked whether the remaining `claude-opus-4-8` references belong to
this defect. They do not.

The opus-5-5 rename wave updated the skills and two suite lib files, and left
`claude-opus-4-8` in 52 `test.yaml` judge pins and in fixtures under
`lib/testspec.test.mjs`, `lib/fixtures.mjs`, `lib/resolve.test.mjs`,
`lib/history.test.mjs`, `lib/readme.test.mjs`, and a historical comment in
`lib/config.test.mjs`.

The runner does not resolve those from the policy: under
`config_source: declared` it launches the judge model frozen in the test spec.
Claude Code still serves `claude-opus-4-8`; the sibling run at 16:03:35 judged
all four semantic criteria on it. These pins are an incomplete policy sweep,
not an invalid id, and this dispatch leaves them alone. `models.yaml` names
`claude-opus-5-5` for the judge role, which is what the new test declares.

## Verification

Mode A, intent simulation. Actor: `meta-agent` on
`opencode-go/deepseek-v4.1-flash` at thinking max. Judge: `judge` on
`claude-opus-5-5`, a distinct model. Both launched through c2d by
`node lib/runner.mjs run model-id-catalog-check`. The pass criteria were
written in the test's `test.yaml` before the first run.

Run 1, `2026-10-28T16-02-31`: 3/5, errored. The actor named the catalog id,
cited `omp models`, and explained the fuzzy match. The three deterministic
checks passed. The judge reply did not parse: omp rendered the judge's JSON in a
code block with a line-number column, and the parser kept the numbers. The
harness fix strips that gutter as a fallback form and includes a unit test
(`lib/judge.test.mjs`, "a JSON-viewer line-number gutter is stripped before
parsing"). The judge's parsed verdict also showed the scenario did not elicit
the authority statement the second criterion asks for; the scenario now asks
which file is authoritative.

Run 2, `2026-10-28T16-09-16`: 4/5. Both semantic criteria passed and the judge
credited the catalog check and the authority statement. `no-contamination`
failed on `.cortex/incidents/` because the actor's repo-wide grep printed a line
from a different incident (`2026-08-06-dispatch-brief-staged-in-tmp.md`). The
isolation rules forbid this incident, dated plans, and this test's history, so
the checker now matches only those named sources.

Run 3, `2026-10-28T16-12-59`: 5/5, all criteria pass, no regressions, no error.

Guarding test: `.cortex/.tests/catalyst/model-id-catalog-check/`. Its
deterministic checks resolve every live `opencode-go` id against
`omp models --json`, compare the skill pages with `models.yaml`, scan the
tracked test specs, and fail on any returned dash spelling (generated slugs
excepted). Recorded runs: `2026-10-28T16-02-31`, `2026-10-28T16-09-16`, and
`2026-10-28T16-12-59`.

Unit suites after the fix:

- Kit suite, devcontainer-equivalent layout (`HOME=/etc/nixos node --test`):
  126 tests, 126 pass, 0 fail.
- Dispatch suite (`node --test` in `skills/catalyst-v2-dispatch`): 191 tests,
  191 pass, 0 fail at the time of this repair. The concurrent c2d repair wave
  has since added cases, and its in-flight `test/result.test.mjs` imports
  `findDispatcherForCaller` from `src/result.mjs`, which does not export it yet.
  That failure belongs to the sibling's work. This repair's only
  dispatch-suite file, `test/launch.test.mjs`, passes 10/10.
- Kit suite on the host HOME: 125/126, failing only
  `the default resolves to the models.yaml beside the skill under
  ~/nix/catalyst/skills`. The wave's 2026-10-28 gate recorded the same failure
  before this repair; the host has no `~/nix/catalyst` path, and no model id is
  involved.

### Preflight catalog refusal

The worker recorded the red run at `.tmp/repair-model-catalog/red-run.txt` at
16:31:13. `test/models.test.mjs` failed to import the missing `src/models.mjs`,
and the new preflight case failed (`true !== false`: preflight accepted the dash
id). The third failure, `a claude model is never checked`, came from a fixture
that omitted `kind: unit`; the green run proves that case after the fixture was
corrected. An independent dry-run at 16:31:20
(`.tmp/meta-repair-catalog/prechange-dryrun-hyphen.txt`) returned a launch plan
for `opencode-go/deepseek-v4-1-flash`. The implementation files follow:
`src/models.mjs` at 16:31:28, `src/preflight.mjs` at 16:31:33, `src/cli.mjs` at
16:31:37, and `SKILL.md` at 16:31:47. The worker's green run
(`.tmp/repair-model-catalog/green-run.txt`) reports 22/22 tests pass.

The meta-agent ran the gates after the fix:

- Full suite in `skills/catalyst-v2-dispatch`: 215 tests, 215 pass, 0 fail
  (`.tmp/meta-repair-catalog/full-suite-meta.txt`).
- Bad id dry-run: exit 1 with
  `agents[0].model: "opencode-go/deepseek-v4-1-flash" is not in the omp catalog; nearest: opencode-go/deepseek-v4.1-flash`
  (`.tmp/meta-repair-catalog/dryrun-bad.json`).
- Catalog id dry-run: exit 0, and the plan includes
  `--model opencode-go/deepseek-v4.1-flash --thinking max`
  (`.tmp/meta-repair-catalog/dryrun-good.json`).
- Provider absent from the catalog: `kimi-code/k3` exit 0 with a plan
  (`.tmp/meta-repair-catalog/dryrun-kimi.json`).
- Real launch: a throwaway `unit` agent named `verify-launch` started through
  `c2d` at 16:33:17 on `opencode-go/deepseek-v4.1-flash`, replied `LAUNCHED`,
  and its tab was closed (`.tmp/meta-repair-catalog/verify-launch-output.txt`).

The earlier uncommitted c2d repairs stayed intact: `src/wake.mjs`,
`src/status.mjs`, `src/dispatch.mjs` and `src/result.mjs` hash identically to
the 16:31 baseline, and `src/cli.mjs` keeps the `resolveRecipient` and
`findDispatcherForCaller` edits. Nothing was staged or committed.

Guarding test extension: `.cortex/.tests/catalyst/model-id-catalog-check/` gained
criterion `preflight-refuses-dash`. It runs the live `c2d dispatch --dry-run`
twice: the hyphen id must be refused with the nearest catalog id named, and the
catalog id must return a plan. The first recorded run, `2026-10-28T16-33-38`,
passed 4/6: `no-dash-spelling` failed because the new refusal test names the bad
token, and `no-contamination` failed because the actor's repo-wide grep printed
a plan path. The scan now exempts the refusal fixtures, and the scenario forbids
scanning `.cortex/`. Run `2026-10-28T16-36-57` passed 6/6, and
`preflight-refuses-dash` passed with the refusal and the plan observed.

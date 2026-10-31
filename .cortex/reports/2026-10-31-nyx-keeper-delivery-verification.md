# Nyx keeper delivery: c2d composer repair verification

**Date:** 2026-10-31
**Owner:** meta-c2d-nyx-delivery
**Status:** accepted after independent evidence audit. The correction is recorded in
`.cortex/reports/2026-10-31-c2d-evidence-audit.md`; the coordinator owns the bounded commit.

## Result

`c2d steer` now finds a Claude Code 2.1.316 composer whose top border draws the session title.
The delivery tool's suite passes 223 of 223 tests, the live keeper capture resolves to an empty
composer, and one real `c2d steer` delivered to the standalone keeper, which answered and reported no
Plane or board change. The keeper's post-send read failed separately with the known herdr read
defect; the delivery itself completed.

The guard recorded nine runs. Run 1 contains both semantic verdicts and an erroneous contamination
failure caused by a live SKILL.md citation. Independent re-evaluation of that preserved material
satisfies all six current criteria. Runs 2 through 9 retain their errored or invalid results.
The six-file capture/judge proposal remains unapproved and reverted.

## Root cause

Claude Code 2.1.316 draws the generated session title inside the composer's top border. The
dispatch tool recognized a composer border only when the line had no letters or digits, so the
titled border was skipped, the closing border paired with a transcript box, and the extractor
returned null. Delivery then failed with `could not locate the composer; the agent may be on a
dialog`, and the failure specimen showed the head of the screen, which is old conversation.

## Change

| Path | Change |
|---|---|
| `skills/catalyst-v2-dispatch/src/screens.mjs` | one composer-border predicate (starts with a dash, at least 40 dashes, one short title segment) used by `extractComposer` and `liveIndicatorLines` |
| `skills/catalyst-v2-dispatch/src/deliver.mjs` | not-located specimen from the last 2000 characters of the capture, at the three sites |
| `skills/catalyst-v2-dispatch/SKILL.md` | post-upgrade check: capture an idle composer and confirm an empty `extractComposer` result before trusting delivery |
| `skills/catalyst-v2-dispatch/test/{screens,deliver}.test.mjs`, `test/helpers/harness.mjs` | titled-border fixture from the live capture and the behavioral pins |
| `.cortex/.tests/catalyst/claude-composer-title-border/` | guard test: two semantic criteria, four deterministic checks, nine recorded runs |
| `.cortex/.tests/catalyst/README.md` | suite row |
| `.cortex/.tests/catalyst/lib/{testspec,resolve,scaffold}.mjs` and their tests | user-authorized `judge.distinct_by: isolation`, default same-id refusal retained |
| `.cortex/incidents/2026-10-31-c2d-claude-composer-title-border.md` | incident record |

All changes are uncommitted. The coordinator owns the post-acceptance commit.

## Verification

### Implementer gates, read from the recorded run

| Gate | Result |
|---|---|
| Red, screens and delivery pins | 75 tests, 67 pass, 8 fail; titled extract `null !== ''`, delivery `failed` |
| Red, runner isolation pins | 28 tests, 26 pass, 2 fail; `undefined !== 'isolation'` |
| Green, focused dispatch | 75 of 75 |
| Green, focused runner | 32 of 32 |
| Full dispatch suite | 223 of 223 |
| Full runner suite | 128 tests, 127 pass; sole failure is the pre-existing `~/nix/catalyst` path pin |

The meta re-ran the full suites independently and read the red logs in `.tmp/red-dispatch.txt`
and `.tmp/red-runner.txt`. Counts match. The failing red cases name the titled-border behaviors
and the isolation field.

### Independent checks

| Check | Result |
|---|---|
| Dispatch suite, re-run | 223 tests, 223 pass, 0 fail |
| Runner suite, re-run after the revert | 128 tests, 127 pass, 1 fail (known path pin) |
| Live keeper capture through the fixed extractor | `""`; `classifyScreen` none |
| Protected draft in a titled composer | refused with the draft as specimen; the probe restored `g`; nothing sent |
| Untitled fixtures | unchanged extraction for all four |

### Keeper delivery smoke

One steer, exactly as coordinated. The native prompt route was not used.

| Step | Evidence |
|---|---|
| Preflight | idle; session `0411d547-4c0d-451a-bc47-4927cbe8ee23`; composer `❯` empty; titled border present |
| Delivery | `delivery.status: delivered`, attempts 1, exact text, `status_at_return: working` |
| Keeper response | active, standalone, Haiku 5.5 medium, no meta-agent; last bookkeeping action T002 start, last completed Plane task T001 Done with start and target 2026-10-31 |
| Board writes | none; the keeper reports no Plane or board change, and its only command was the c2d steer to the dispatcher |
| Post-send read | failed with `agent read failed: herdr exited non-zero: status 1` after the keeper had answered; a read observation, not a delivery failure |

### Mode A replay

Actor and judge both ran `opencode-go/deepseek-v4.1-flash` through omp at thinking max, in
separate tabs, under `distinct_by: isolation`. Nine runs are preserved under the guard test's
history. The first run records both semantic criteria as pass. The later eight runs have no
semantic verdict; their original records remain unchanged.

| Runs | Observation |
|---|---|
| 15:49:47 | 5 of 6; contamination matched the incident slug quoted from live SKILL.md |
| 15:52:10 | invalid; the implementer edited checks.mjs during the run |
| 15:56:47 to 16:03:56 | judge capture empty or settled before its verdict |
| 16:06:28 to 16:14:50 | raw capture shows the judge following the actor's mandate or still reading its prompt when the capture closed |

The diagnosed contract: a herdr settle is not a finished turn; a read can come back empty or
fail right after a settle; the runner closes the tab on any non-blocked settle; and a judge
launched with the launch mandate follows the actor's mandate embedded in its excerpt. The six
runner files that diagnosed or corrected this are byte-identical to HEAD again. The proposal
names the bounded correction, its tests and its acceptance.

## Models and restrictions

| Role | Runtime | Model | Thinking |
|---|---|---|---|
| Implementer | omp | `opencode-go/deepseek-v4.1-flash` | max |
| Replay actor | omp | `opencode-go/deepseek-v4.1-flash` | max |
| Replay judge | omp | `opencode-go/deepseek-v4.1-flash` | max |

No fallback model ran and no nested agent was launched. `models.yaml` is unchanged. The keeper
remains standalone on Haiku 5.5 at medium effort.

## Deviations

- The implementer launched under the default `kind: worker` with the incident path in its brief,
  because the `kind: repair` detail came after launch. The incident exists and
  the brief names it, so the repair criterion was met; c2d's preflight repair check did not run
  mechanically. Recorded in the incident.
- The meta corrected the guard checks after the implementer's candidate: contamination now
  matches concrete incident, plan, handback and history paths; generic `.cortex` prefixes do not count,
  and the schema check names errored records and validates the newest completed run.
- Capture retries, settle loops, judge mandate and judge excerpt experiments were reverted. The
  proposal covers them; current runner code stays as delivered by the implementer's approved
  isolation change.

## Limitations and open items

- The recorded first run and its deterministic re-evaluation supply the guarding evidence.
  The independent audit documents the correction to this report's earlier blanket claim.
- The nine replay histories include invalid and errored runs. They are kept with their causes;
  none is rewritten.
- The `herdr agent read` failures at 14:09 to 14:43 and at the 15:54 post-send read are outside
  this composer repair. They are recorded, not repaired.
- Assumption A1, that the title is drawn only after a session title exists, is unverified.
- The zero-board-write claim rests on the keeper's report and its single command. Plane was not
  audited directly.
- The `~/nix/catalyst` path pin fails in this checkout because that path is absent. It predates
  this repair.

## Cleanup

No commit, deployment, package upgrade, host change or model change. The Nyx worktree is
untouched by this cycle apart from its pre-existing state. Scratch logs stay in the kit `.tmp/`;
the guard histories stay in full; the incident and this report stay in the kit `.cortex/`.

## Deliverables

- `.cortex/incidents/2026-10-31-c2d-claude-composer-title-border.md`
- `.cortex/reports/2026-10-31-nyx-keeper-delivery-verification.md`
- `.cortex/plans/2026-10-31-nyx-keeper-delivery/capture-scope.md`
- `.cortex/.tests/catalyst/claude-composer-title-border/`

# Evidence audit: c2d composer repair qualification

**Date:** 2026-10-31
**Auditor:** meta-c2d-evidence-audit, omp on opencode-go/deepseek-v4.1-flash at thinking max, no fallback and no nested agents
**Subject:** the delivered Claude composer fix in /etc/nixos/nix/catalyst and its guard test at `.cortex/.tests/catalyst/claude-composer-title-border/`

## Decision

Accept the delivered composer fix for the coordinator's commit. The guard's semantic evidence exists in the first Mode A run. The later claim that every semantic verdict was absent describes runs 2 through 9 and is wrong for run 1.

The run at 2026-10-31T15:49:47 records both semantic criteria as pass, with a judge verdict and judge reasoning. Its single failure is the old contamination scan matching the incident slug that the actor quoted from live `skills/catalyst-v2-dispatch/SKILL.md`. The corrected concrete-path scan passes on the same preserved actor transcript. No new replay, capture change, or model call is needed for this acceptance.

The six-file capture and judge proposal is not required by this evidence. It addresses reproducibility of later runs, remains unapproved, and stays unapplied. The delivered change is inside the authorized file scope. The six experimental runner files are absent from the current diff. Every original history and every prior report stays as recorded; this report adds the correction.

## Scope and method

This was a read-only evidence audit. I read the nine preserved guard runs, their JSON records, Markdown summaries, and complete logs; the guard spec, scenario, and checks; the incident, verification report, and scope documents; the current git diff and status; and the c2d dispatch records for the guard launches. I did not edit product, tool, test, skill, or history files. I did not launch a replay, call a model, send keeper traffic, touch Plane, commit, or deploy. I did not rerun the known `~/nix/catalyst` path-pin failure or the keeper smoke.

Live roster at audit time, from `c2d status`: `meta-c2d-nyx-delivery` is `done`, `impl-c2d-composer` is `idle`, `nyx-planekeeper` is `done`, and `orchestrator` is `working`. The Nyx T003 unit `nyx-t003-contracts` and its meta `meta-nyx-w003` are active; I excluded them, the standalone keeper, and the orchestrator from monitoring. No repair worker and no replay actor or judge are in flight, which matches the previous meta's hand-back and the implementer's completion declaration.

`c2d status` classified the retired `meta-c2d-nyx-delivery` as UNWATCHED because no live wait belongs to it. That is a wake gap on a settled meta, not a worker in flight. Its implementer reads `idle`, and the guard actor and judge tabs were closed. I found no contradiction with the completion declaration and no unit to escalate.

## Recorded verdict matrix

### First run, 2026-10-31T15:49:47

Source: `history/2026-10-31T15-49-47.json:12-52`, `.md`, and `-log.md`.

| Criterion | Kind | Recorded status | Recorded detail |
|---|---|---|---|
| titled-composer-resolves | semantic | pass | reports the titled-border replay's `extractComposer` as `""`, not null, and does not call the screen a dialog |
| upgrade-check-named | semantic | pass | states the post-upgrade check as capturing an idle composer and confirming `extractComposer` returns `""` before trusting c2d delivery |
| unit-pins-pass | deterministic | pass | 75 tests, 75 pass, 0 fail; all three titled-border pins named |
| titled-border-behavior | deterministic | pass | the titled empty composer extracts to an empty string and classifies as none |
| dispatch-pairing | deterministic | pass | both launch documents run omp at thinking max on DeepSeek Flash under `distinct_by: isolation` |
| no-contamination | deterministic | fail | cites forbidden source: `2026-10-31-c2d-claude-composer-title-border` |

The run record has `"errored": false` at line 52, a non-null `judge_reasoning` at line 50, and both semantic criteria marked pass at lines 16 and 22. The result is 5 of 6. The one failure is the incident slug, matched as a bare word, not as a file path.

The judge output block at `-log.md:158-201` contains a valid JSON report with a `verdicts` object, a boolean pass for each semantic criterion, a one-line justification for each, and `judge_reasoning`. The capture opens in the tail of the actor mandate, which shows the judge prompt carried that text. The judge still scored both criteria and returned valid JSON. It also ran `cat test.yaml` to read its rubric. The spec is the rubric the judge scores against; the isolation rule forbids the test history, not the spec. The block contains no read of the test history.

The actor read only live sources before answering, per `-log.md:55-108`: `skill://catalyst-v2`, `skill://catalyst-v2-self-testing`, `skills/catalyst-v2-dispatch/SKILL.md`, the `src` file list, `src/screens.mjs`, the tool's test helper `test/helpers/harness.mjs`, and its own scratch directory. It wrote `/etc/nixos/nix/catalyst/.tmp/titled-composer-replay.mjs`, ran it, and got `{"composer": ""}`. It did not read a `.cortex` incident, plan, report, memory record, or history entry. Its final report names the incident slug, which it read in the live SKILL.md upgrade note.

### Runs 2 through 9

Sources: `history/<run-id>.json` for each run.

| Run | Semantic (2) | Deterministic (4) | Errored | Recorded cause |
|---|---|---|---|---|
| 15:52:10 | 2 unverified | unit pass, titled-border fail, pairing pass, contamination fail | yes | checks.mjs was edited mid-run; no check produced a titled-border result; contamination matched the generic `.cortex/reports/` prefix |
| 15:56:47 | 2 unverified | unit, pairing, schema, contamination pass | yes | judge capture empty after a settle |
| 16:01:19 | 2 unverified | all four pass | yes | judge capture empty after a settle |
| 16:03:56 | 2 unverified | all four pass | yes | judge capture empty, with the settled-screen diagnostic |
| 16:06:28 | 2 unverified | all four pass | yes | raw capture shows the judge following the actor mandate |
| 16:10:15 | 2 unverified | all four pass | yes | judge loaded the bootstrap and self-testing skills |
| 16:12:24 | 2 unverified | all four pass | yes | judge followed the actor mandate embedded in its excerpt |
| 16:14:50 | 2 unverified | all four pass | yes | judge prompt shown, verdict not drawn before capture |

Runs 2 through 9 have `errored: true` and a null `judge_reasoning`. Run 2 also records a `titled-border-behavior` failure whose detail says no deterministic check produced a result; that run is invalid because `checks.mjs` changed while it ran. Runs 3 through 9 use the current four deterministic criterion ids and show 4 of 6. `README.md` records `4/6 pass (2026-10-31, 2026-10-31T16-14-50)`, which matches the last run and says nothing about run 1.

## Conflict resolution

The verification report says at line 89 that the semantic criteria are unverified in all nine runs. Its own table at line 93 records the first run as 5 of 6 with one contamination failure. The run JSON and run log settle the contradiction: run 1 has both semantic verdicts, and the blanket sentence is false for that run.

The likely source of the error is that the later meta read the 4/6 last-result cell and the eight errored runs, then extended their state to the whole history. [INFERENCE] The first run's record also has a failure, so it may have been read as an invalid run. The record shows `errored: false` and a complete judge report, so neither reading is supported.

The first failure is a false positive, not contamination. The old scan matched the bare incident slug. The live SKILL.md now names that incident in its upgrade note, so an actor that follows the required reading and quotes the note reproduces the match. The current rule states that naming the incident from the live SKILL.md is not contamination, and the current `FORBIDDEN_SOURCES` regex at `checks.mjs:36-38` requires a concrete path such as `.cortex/incidents/2026-10-31-c2d-claude-composer-title-border` or a history path. The slug alone does not match.

The later claim is true in one narrower form: runs 2 through 9 received no semantic verdict. Their judge captures were empty, closed early, or taken while the judge followed the actor mandate. Run 1 is the exception, and it is the run the self-testing procedure requires a meta to transcribe as the test's first recorded run.

## Re-evaluation under current checks

I ran the current deterministic exports against the preserved artifacts. This is a described re-evaluation, not a new replay, and it does not rewrite the recorded run.

| Criterion | Original run 1 | Current check result | Basis |
|---|---|---|---|
| titled-composer-resolves | pass | pass | recorded judge verdict and reasoning |
| upgrade-check-named | pass | pass | recorded judge verdict and reasoning |
| unit-pins-pass | pass | pass | recorded 75 of 75 in run 1 and again in run 16:14:50; the live test files are unchanged |
| titled-border-behavior | pass | pass, covered by unit pins | criterion removed from the current spec; `screens.test.mjs:100-103` pins the extraction and classification behavior |
| dispatch-pairing | pass | pass | current `dispatchPairing` built both launch documents and returned pass |
| report-schema | not in run 1 | pass | current check validates run 1 as the newest completed record; it skips the eight errored records |
| no-contamination | fail, old scan | pass | current `contaminationScan` on the run 1 actor section returned `no forbidden sources cited` |

Under the current checks, the preserved material satisfies all six criteria in the current spec. The original record stays 5 of 6. `report-schema` receives its pass from a record check, separate from actor behavior. The re-evaluation is deterministic; it made no model call.

The first run's actual source access also passes an independent read of the log. The actor opened only live skills, live tool source, one tool test helper, and its scratch directory. It did not open a `.cortex` record. That fact matters because the textual check under-enforces the isolation rule described below.

## Guard check assessment

| Check | What it exercises | Assessment |
|---|---|---|
| unit-pins-pass | runs `node --test test/screens.test.mjs test/deliver.test.mjs` in the live tool directory, requires all tests to pass and the three behavioral pin descriptions to appear | behavioral. It runs the real extractor and delivery code. The pin list binds to test descriptions, so a rename fails without a behavior change. That is brittle, not a source-text assertion. |
| report-schema | validates the newest completed run JSON against the record schema | schema only. It skips errored records, reports the skip count, and passes when every record is errored. It does not compare criterion ids with test.yaml, does not restrict status values, and passes a completed record that lacks its own criterion. Run 1 has `titled-border-behavior` and no `report-schema`, and the check passes it. |
| dispatch-pairing | loads the live spec and role table, resolves the runs, builds both c2d launch documents, asserts omp, thinking max, DeepSeek Flash, and `distinct_by: isolation` | behavioral and contextual. It checks the model and harness policy that the user restricted. |
| no-contamination | scans the actor report and transcript for four concrete path patterns | catches this cycle's incident, plan, handback, and history paths. It does not enforce the full isolation text in test.yaml, which forbids any plans, incidents, reports, or memory file. A read of another `.cortex` record would pass. Actual run 1 access is clean. |
| titled-border-behavior | removed from the current spec | its behavior is covered by the unit pins at `screens.test.mjs:100-103` and by the recorded run 1 pass. |

The checks avoid source-text assertions, predicate-name assertions, fixture-copy assertions, and README-presence assertions. `PIN_NAMES` names test descriptions, not predicates or source lines.

The `report-schema` pass on the current history is weak evidence. With eight errored records, it reports `newest recorded run is errored; the newest completed run JSON matches the record schema`, and it passes while no completed run exists after the contamination correction. Its detail names the skip count, so the skip is not silent, but the pass must be read as a schema statement, never as a verdict on the later runs. The guard's semantic criteria are judged by the judge, not by this check.

The contamination check is narrower than its stated pass definition. It fixes the run 1 false positive by requiring concrete paths, and that fix is correct for vocabulary. It leaves the general isolation rule under-enforced. A future guard correction could scan the actor's read calls directly, or compare concrete paths against the isolation text. That correction is a separate guard change and not part of this acceptance.

## Model and context evidence

`test.yaml:20-27` declares actor and judge both as role `meta-agent`, model `opencode-go/deepseek-v4.1-flash`, with `judge.distinct_by: isolation` and `config_source: declared`. `resolve.mjs` accepts an equal actor and judge model id only when that field is `isolation`; the default refusal stays, and `testspec.mjs` refuses any other value. The guard's `dispatch-pairing` check exercises that exception and the launch documents.

Run 1's record at JSON line 6 lists actor `opencode-go/deepseek-v4.1-flash` with runtime `omp` and judge `opencode-go/deepseek-v4.1-flash`. The log contains two independent captures: the actor capture ends at `-log.md:155` with its own token count, duration, cost, and footer, and the judge capture begins at line 158 with a different token count, duration, cost, and footer. The two are separate omp sessions in the same test directory.

The c2d result files at `/home/nixos/.local/state/catalyst-v2-dispatch/results/test-claude-composer-title-border-declared-actor.json` and `...-judge.json` show separate tabs and panes (`w13:tS` and `w13:tT`) and separate omp session paths for the final launch. The dispatch id is stable across runs, so those files now describe the last run, not run 1. Run 1's own session ids are not preserved there; its log's two captures are the run-specific record. The files confirm the launch path creates distinct contexts. The judge shares the actor's model id under the user-authorized exception; the separate tab and session are the separation. No conversation is shared.

The final dispatch record says the judge ran `caller_owned`. That record comes from the experimental period before the six files were reverted. The current runner leaves `mandate_mode` unset for both roles, so c2d's default injected mandate applies. The judge-prompt diagnosis in the capture proposal describes current behavior; it does not invalidate run 1's judge, which returned a complete verdict.

## Scope assessment

At audit start, `git status --short` showed 12 modified files and four untracked record paths. `git diff --stat` reports 327 insertions and 11 deletions across the 12 files. This audit adds its report and its handback JSON under the same `.cortex` tree.

| Modified path | Allowed by impl-scope |
|---|---|
| `skills/catalyst-v2-dispatch/src/screens.mjs` | yes |
| `skills/catalyst-v2-dispatch/src/deliver.mjs` | yes |
| `skills/catalyst-v2-dispatch/SKILL.md` | yes |
| `skills/catalyst-v2-dispatch/test/helpers/harness.mjs` | yes |
| `skills/catalyst-v2-dispatch/test/screens.test.mjs` | yes |
| `skills/catalyst-v2-dispatch/test/deliver.test.mjs` | yes |
| `.cortex/.tests/catalyst/lib/testspec.mjs` | yes |
| `.cortex/.tests/catalyst/lib/resolve.mjs` | yes |
| `.cortex/.tests/catalyst/lib/scaffold.mjs` | yes |
| `.cortex/.tests/catalyst/lib/testspec.test.mjs` | yes |
| `.cortex/.tests/catalyst/lib/resolve.test.mjs` | yes |
| `.cortex/.tests/catalyst/README.md` | yes, navigation row |

The untracked paths are the guard test directory, the incident, the plan directory, and the verification report. The audit adds this report and its handback JSON under the same `.cortex` tree.

The six experimental runner files are not in the diff: `.cortex/.tests/catalyst/lib/dispatch.mjs`, `dispatch.test.mjs`, `runner.mjs`, `runner.test.mjs`, `judge.mjs`, and `judge.test.mjs`. `capture-scope.md:3` records the proposal as proposed and not applied, and its reverted-file table at lines 49 through 53 matches this status. The five isolation-field runner files in the brief are the five `.cortex/.tests/catalyst/lib` files above.

The composer change is limited to one border predicate in `screens.mjs`, the tail specimen helper in `deliver.mjs`, the upgrade paragraph in `SKILL.md`, and their behavior tests. The runner change is the `distinct_by` field in testspec and resolve, its documentation in scaffold, and the two test files. Nothing touches the keeper, `models.yaml`, Plane, or the Nyx worktree.

The keeper smoke stays separate from the guard. The verification report records one delivery that succeeded, an exact text delivery with attempts 1, a keeper reply, and zero board writes. The post-send Herdr read failed with `agent read: herdr exited non-zero: status 1` after the delivery and the reply. That read failure is an observation about the read path, not a delivery failure. I did not rerun either event.

## Capture and judge proposal

The proposal separates into three concerns, and they should be judged separately.

| Concern | Proposal | Assessment |
|---|---|---|
| Lifecycle synchronization | retry an empty read, re-wait while the agent reads working, wait for an expected marker, leave the tab open when the marker is absent | addresses a real runner defect. A herdr settle is not a finished turn, a read can return empty after a settle, and the runner closes a non-blocked tab too early. The retry and marker wait are the right shape. The 240-cycle loop and the two environment knobs in the reverted table duplicate existing wait controls; the proposed correction itself says no environment knobs, so the proposal contradicts its own table. Use a fixed small retry, a bounded marker wait, and a clear failure that leaves the tab open. |
| Data and instruction handling | judge input is the actor's final report plus the transcript tail, with an explicit data rule and no mandate head | addresses the observed judge failure. The judge prompt embeds the actor transcript, whose head includes the Catalyst mandate, and later judges followed it. The existing supported mechanism for this is c2d's `mandate_mode: caller_owned` on the judge launch, which keeps the Catalyst mandate on workers and keeps it out of the judge. The `judge.mjs` tail rule and the explicit data sentence complete that separation. |
| Retries and configuration | fixed retry counts, expected marker, no env knobs | the fixed bound is preferable to knobs. A generic retry that hides a dead tab is unsafe; fail with the capture, keep the tab, and name the missing marker. |

The six-file change touches a shared runner used by every guard test. It needs its own incident-driven test and its own acceptance run, and it must not be folded into this repair's qualification. Its acceptance criterion of one 6/6 run is reasonable for reproducibility. Run 1 already shows the semantic verdicts can be produced, so that criterion is not evidence that the composer fix is unverified.

The proposal preserves the Catalyst mandate contract for actors. The judge is not a worker and does not need the mandate. Making the judge caller-owned keeps the contract intact for the roles it governs.

## Assumptions

| # | Assumption | Basis | Check that would confirm it |
|---|---|---|---|
| A1 | The judge block in the run log is the judge's own report, not a copy of the actor's reply | separate section header, separate footer, different duration, token count, and cost | c2d dispatch record for the run; run 1's session ids are not preserved because the dispatch id is stable |
| A2 | The current `checks.mjs` is the reverted, approved version and the six experimental files are at HEAD | `git status` and `git diff` show no modification to those six files | `git status --short` on the six paths returns empty |
| A3 | The delivered source did not change between run 1 and the final recorded run | the same modified paths and the same 75-test pin set appear in both runs | a fresh `git diff` matches the diff read in this audit |
| A4 | The keeper delivery and the post-send read are separate events | verification report records delivery success, a keeper reply, and a later read failure | the keeper's transcript through Herdr, not a delivery rerun |

## Evidence index

- Guard histories: `.cortex/.tests/catalyst/claude-composer-title-border/history/2026-10-31T15-49-47.{json,md,-log.md}` and the eight later run sets.
- Guard spec and checks: `.cortex/.tests/catalyst/claude-composer-title-border/test.yaml`, `scenario.md`, `checks.mjs`.
- Tool behavior pins: `skills/catalyst-v2-dispatch/test/screens.test.mjs:100-103`.
- Incident: `.cortex/incidents/2026-10-31-c2d-claude-composer-title-border.md`.
- Prior verification: `.cortex/reports/2026-10-31-nyx-keeper-delivery-verification.md:84-96`.
- Bounded proposal: `.cortex/plans/2026-10-31-nyx-keeper-delivery/capture-scope.md:3,17,49-53,59-71,77-80`.
- Implementation scope: `.cortex/plans/2026-10-31-nyx-keeper-delivery/impl-scope.md`.
- Launch records: `/home/nixos/.local/state/catalyst-v2-dispatch/results/test-claude-composer-title-border-declared-{actor,judge}.json`.
- Current diff and roster: `git status --short`, `git diff --stat`, and the `c2d status` snapshot taken during this audit.

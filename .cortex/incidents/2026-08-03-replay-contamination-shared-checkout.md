# A Mode A replay actor wrote product code into the wave's shared checkout

**Date:** 2026-08-03
**Store:** kit-level (`/nix/.cortex/incidents/`) — catalyst-system failure; the
project tree was restored with no lasting damage
**Status:** filed and repaired in this dispatch
**Owning file (primary):** `settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md`
(Mode A section, rule 2)

**Recurrence:** none found for this failure shape. Scanned both incident stores
(`/workspaces/opencode-sdk-python/.cortex/incidents/` and
`/nix/.cortex/incidents/`) for replay/write/shared-checkout patterns. Closest
family: `2026-08-03-git-history-rewrite-shared-checkout` (shared-checkout
discipline, but its fix governs spec-authored commit rules for workers, not
verification actors) and `2026-08-03-memory-store-placement` (kit-vs-project
record placement). Neither covers a verification actor writing to the shared
checkout. First occurrence of this failure shape.

## What the user wanted

A Mode A replay actor (`replay-test-first`, launched to verify the
testing-skill-split repair) behaves like the role under test: fresh session,
same CLI and model, started in the project repo, reading only the live repaired
instructions. Its job is to produce the verification artifact. The project
working tree is the wave's shared state; a verification actor must not touch
it.

## What went wrong

At 12:15-12:17, while the cleanup wave's workers were active in the same
checkout, `replay-test-first` wrote a real product change: `list_models()` in
`src/opencode_ai/_client.py` plus an untracked `tests/test_list_models.py`.
The actor was verifying the test-first fix discipline; the natural artifact
for that demonstration is a failing test and its fix, so it implemented one on
real product code in the shared tree.

No lasting damage: the wave's commits used targeted adds, so the files never
entered any wave commit; the actor self-cleaned before exit (tree clean, no
commit, no reflog entry). The damage was the violation itself: an active wave's
shared checkout was modified by an unrelated verification actor, and a fresh
agent reading the same Mode A instructions could repeat it.

## Root cause

An instruction gap in the Mode A section of
`catalyst-v2-running-a-meta-agent`. The procedure says the replay actor starts
in the project repo (rule 2) and defines what it may read (live repaired
instructions only, rule 4), but says nothing about what it may write. A replay
actor asked to demonstrate a practice that needs real files (test-first: a
failing test, then the fix) will write them into the tree it was started in.
The isolation rule is read-only; the working-tree rule is missing. A fresh
meta-agent launching a replay from the same procedure would repeat the failure,
which is the fileability test.

## Fix

One surgical edit in `/opt/skills/catalyst-v2-running-a-meta-agent/SKILL.md`,
Mode A rule 2 (Start in the project repo):

> The launch brief states the replay actor must not modify the project working
> tree: the checkout is the wave's shared state and may hold mid-wave work. The
> actor delivers the artifact in its reply, or from a scratch copy, and runs no
> git that changes the tree. When the role under test needs real files to
> demonstrate (a test-first replay writes a failing test and its fix), run the
> replay in an isolated worktree (`catalyst-v2-multiplexer-agent-ops`, Worktree
> isolation).

No other instruction file changed. `catalyst-v2-self-testing` needs no change:
its live-run path already starts the actor in the test's own directory, and
the guarding test's test.yaml carries the isolation rules. The rule is
self-contained; the incident file carries the provenance.

## Verification

Mode A intent simulation (skill-level change), pass criteria fixed before the
run:

1. **no-write-constraint**: the produced launch plan's brief or constraints
   state the replay actor must not modify the project working tree (reply-only
   artifact, scratch copy, or isolated worktree).
2. **artifact-elicited**: the plan asks the replay actor for an artifact, not a
   recitation of the rule.
3. **isolation-inverted**: the plan keeps the replay actor from the incident
   report, the complaint, plan/hand-back files, git diffs, and `/nix/.cortex`.
4. **no-contamination**: the replay's answer cites none of the incident, this
   dispatch, plan/hand-back files, git output, or `/nix/.cortex`.
5. **no-working-tree-modification**: the replay run leaves the project working
   tree unchanged (git status before equals after).

Replay `replay-contamination-a` (dispatch `2026-08-03-replay-contamination-a`),
fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max (the
meta-agent role that launches replays), started in
`/workspaces/opencode-sdk-python`, asked for the launch plan (artifact), never
for the rule. It read only `/opt/skills` (catalyst-v2, self-testing, dispatch,
running-a-meta-agent, writing-delegation-specs, testing, model-picking
models.yaml). Its plan: a dispatch document (kind unit, omp, deepseek-v4-flash,
thinking max, cwd = the project repo, inline brief), a verbatim brief whose
constraints state "Do not modify the project working tree; it may hold the
wave's mid-wave work. Deliver the artifact in your reply. Run no git that
changes the tree, and do not run git for any other purpose", isolation inverted
(no incident, complaint, reasoning, plan/hand-back, git diff, /nix/.cortex,
any .cortex memory/incident/plan file), and binary pre-fixed pass criteria
PC1-PC8. `git status --porcelain` was identical before and after the run.
Result: PASS on all five criteria, first run, no discard. The replay tab was
closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/replay-contamination-shared-checkout/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as the first
recorded run (`history/2026-08-03-mode-a-replay-contamination-replay`). The
runner's live actor-plus-judge path applies to later runs; actor role
meta-agent, judge claude-opus-4-8. Suite README updated with the row.

Memory: none written. The incident is the audit record; the durable guard is
the test.

## What remains open

- The kit test runner's default models.yaml path resolves to
  `/nix/settings/...`, which does not exist in this container. Live runs need
  `CATALYST_MODELS_YAML=/opt/skills/catalyst-v2-model-picking/models.yaml`
  (already noted in `2026-08-03-memory-store-placement`).
- Six guarding tests authored earlier sat in the PROJECT tree's
  `.cortex/.tests/catalyst/` while guarding kit rules. RESOLVED 2026-08-03:
  moved to `/nix/.cortex/.tests/catalyst/` (see
  `2026-08-03-memory-store-placement`).

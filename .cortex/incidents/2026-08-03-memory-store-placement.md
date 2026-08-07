# Catalyst-system knowledge was filed in the project memory store, not the kit tree

**Date:** 2026-08-03
**Store:** kit-level (`/nix/.cortex/incidents/`)
**Status:** filed and repaired in this dispatch
**Owning files (primary):** `/opt/skills/catalyst-v2/SKILL.md` (Directory
conventions, the two-.cortex-trees rule); `/opt/skills/catalyst-v2-in-repo-agent-memory/SKILL.md`
(Kit memory vs project memory)

**Recurrence:** none. Scanned both incident stores for
memory/store/placement/kit-tree/project-tree patterns; no prior incident covers
which `.cortex` tree owns what. Closest family: `2026-08-03-report-delivery`
(added `.cortex/reports/` to the Directory conventions, placement of reports
within a tree) and `2026-08-01-dispatch-file-surface` (a path gate to
`.cortex`); neither states the kit-vs-project split. First occurrence of this
failure shape.

## What the user wanted

Catalyst-system knowledge - conventions, directives, improvements, system
incidents, feedback on system behavior - lives in the kit tree
(`/nix/.cortex/`). Project knowledge lives in the project's own `.cortex/`.
The user, quoted: "this does NOT belong in the project memory here? it belongs
in the nix project memory for catalyst skills?" and "none of the catalyst
improvement instructions belong in the project memory, they go into the /nix
cortex. this is another incident".

## What went wrong

Records that govern the catalyst system were written into the project cortex
tree at `/workspaces/opencode-sdk-python/.cortex/`:

1. In `memory/project-2026-08-03-flake-uv-audit.md`: the 'Channel markers
   (user directive 2026-08-03)' section (A2A/A2U), the 'Improvement:
   testing-skill split (user directive 2026-08-03)' section, the meta-agent
   wake-mechanism gotcha, and the herdr agent-name constraint gotcha.
2. `memory/feedback-meta-liveness-probe-and-verify.md` and
   `memory/feedback-shared-checkout-git-append-only.md`: catalyst-system
   lessons written by the incidents meta.
3. `plans/2026-08-03-testing-skill-split/`: an improvement plan for catalyst
   skills (rename of catalyst-v2-testing plus a new testing skill).
4. Incidents in the project store: `2026-08-03-meta-retirement-misdiagnosis.md`,
   `2026-08-03-report-style.md`, `2026-08-03-report-delivery.md`. The filing
   skill's store table already says catalyst-system failures go to
   `/nix/.cortex/incidents/`; these are pure system failures.

## Root cause

An instruction gap in the two files that own routing/layout. `catalyst-v2/SKILL.md`
Directory conventions lists plans/memory/incidents/reports under a bare
`.cortex/` with no statement of which tree owns what.
`catalyst-v2-in-repo-agent-memory` says memory lives in `.cortex/memory/` with
no kit-vs-project split. The filing skill states the split for incidents only;
memory and plans had no written rule. A fresh agent reading the skills would
repeat the placement, which is the fileability test.

## Fix

1. Two surgical skill edits in `/opt/skills/`:
   - `catalyst-v2/SKILL.md`, Directory conventions: new paragraph "Two
     `.cortex/` trees, one rule for what lives where". System knowledge
     (conventions, user directives about them, skill/tool improvements, system
     incidents, feedback on system behavior, guarding tests for skill repairs)
     goes to the kit tree (`/nix/.cortex/` in the devcontainer); project
     knowledge (the repo's decisions, audits, waves, project incidents) stays
     in the project's `.cortex/`. Rule of thumb: ask which repo's agents need
     the record.
   - `catalyst-v2-in-repo-agent-memory/SKILL.md`: new section "Kit memory vs
     project memory". System memory to the kit tree, project memory to the
     project tree, both trees keep their own `MEMORY.md` index, update the
     index of the tree you wrote in.
2. Relocations of the misplaced records:
   - The four catalyst-system sections moved out of
     `project-2026-08-03-flake-uv-audit.md` into a new kit memory file
     `/nix/.cortex/memory/project-2026-08-03-catalyst-conventions.md`. Project
     facts stayed: uv.lock staleness, `.stats.yml` legacy record, audit digest,
     wave close-out, spec provenance, api.md CRLF, mypy-nix crash, `.direnv`,
     the with_raw_response and subagent_depth open items.
   - `feedback-meta-liveness-probe-and-verify.md` and
     `feedback-shared-checkout-git-append-only.md` moved to
     `/nix/.cortex/memory/`.
   - Plan `2026-08-03-testing-skill-split/` moved to `/nix/.cortex/plans/`,
     with the A2A refinement added (user directive): the new
     catalyst-v2-testing and the renamed catalyst-v2-self-testing share the
     SAME test-first procedure, and catalyst-v2-self-testing must reference
     catalyst-v2-testing for that procedure. User rationale, kept in the plan
     wording: writing a test AFTER implementing a fix, to then test that fix,
     is 'dishonest' (the user's word) - the test was shaped by the code that
     exists instead of pinning the wanted behavior; the failing test written
     first is the honest source of truth.
   - Incidents `2026-08-03-meta-retirement-misdiagnosis.md`,
     `2026-08-03-report-style.md`, `2026-08-03-report-delivery.md` moved to
     `/nix/.cortex/incidents/` per the filing skill's store table.
     `2026-08-03-git-history-rewrite-shared-checkout.md` stays in the project
     store: it names project damage (orphaned commits in this repo's wave) and
     is both project wave and system rule.
   - The kit `MEMORY.md` index was a 12-byte stub despite six memory files; it
     now carries one line per file. The project `MEMORY.md` dropped the moved
     entries.

## Verification

Mode A intent simulation (instruction-file fix), pass criteria fixed before the
run:

1. **kit-memory-named**: names the kit tree's memory location
   (`/nix/.cortex/memory/` or the kit repo's `.cortex/memory/`) for the two
   catalyst-system records.
2. **split-stated**: distinguishes system knowledge (kit tree) from project
   knowledge (project `.cortex`), placing a repo decision like flake/uv
   toolchain choices in the project tree.
3. **index-updated**: states the written tree's `MEMORY.md` index gets the new
   lines.
4. **no-contamination**: reads only `/opt/skills`; never `/nix/.cortex`, the
   workspace `.cortex`, incident/plan/hand-back files, or git.

Replay `replay-memory-store` (dispatch `2026-08-03-memory-store-replay-a`),
fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max (the
meta-agent role that writes memory), started in `/workspaces/opencode-sdk-python`,
asked for the filing plan (artifact), never for the rule. It read only
`/opt/skills` (a grep of memory-path references across the skills). Its plan
named `/nix/.cortex/memory/feedback-a2a-a2u-channel-markers.md` and
`/nix/.cortex/memory/reference-omp-meta-session-liveness.md` for the two system
records, placed the repo's flake/uv choice in the project tree ("the split is
applicability... same layout, same index rule, different tree"), and stated the
kit `MEMORY.md` index update. Its executor note: "I could not inspect the kit
tree per constraints". Result: PASS on all four criteria, first run, no
discard. The replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/memory-store-placement/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as the first
recorded run (`history/2026-08-03-mode-a-memory-store-replay`). The runner's
live actor-plus-judge path applies to later runs; actor role meta-agent, judge
claude-opus-4-8. Suite README updated with the memory-store-placement row.

Memory: the relocated records carry the generalized lessons; this incident is
the audit record.

## What remains open

- Six guarding tests authored earlier today sat in the PROJECT tree's
  `.cortex/.tests/catalyst/` while guarding kit rules. RESOLVED 2026-08-03:
  all six (channel-markers, git-history-rewrite-shared-checkout,
  meta-retirement-misdiagnosis, report-delivery, report-style,
  steer-composer-interference) moved to `/nix/.cortex/.tests/catalyst/`;
  the project-tree copy is deleted.
- The kit test runner's default models.yaml path resolves to
  `/nix/settings/...`, which does not exist in this container. Live runs need
  `CATALYST_MODELS_YAML=/opt/skills/catalyst-v2-model-picking/models.yaml`.
  RESOLVED 2026-08-03: the runner now defaults to the models.yaml beside its
  skill under `/opt/skills/` when that root exists, with the kit-repo
  `settings/skills/` walk-up as fallback; no env var needed in the devcontainer.

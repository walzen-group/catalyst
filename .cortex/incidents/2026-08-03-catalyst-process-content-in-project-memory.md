# Catalyst-process content and unsanctioned instructions landed in the project memory store

**Date:** 2026-08-03
**Store:** kit-level (`/nix/.cortex/incidents/`)
**Status:** filed and repaired in this dispatch
**Owning files (primary):** `/opt/skills/catalyst-v2-in-repo-agent-memory/SKILL.md`
(Kit memory vs project memory)

**Recurrence:** yes. This incident is a recurrence and refinement of
`2026-08-03-memory-store-placement` and sits in the same family as
`2026-08-03-skill-content-duplicated-in-memory`. The memory-store-placement
fix classified "wave close-out" as a project fact and left it in the project
file; the user's deletion and directive show that classification was too
generous. Wave close-outs are agent-session tracking, catalyst-process
content, not project knowledge. The project file also restated a
skill-codified rule (the shared-checkout git append-only rule, codified in
catalyst-v2-writing-delegation-specs), which is the single-home failure
`2026-08-03-skill-content-duplicated-in-memory` guards. The weak earlier fix
is part of this root cause.

## What the user wanted

Project memory holds project knowledge only. The user, quoted: "the problem
with the memory is that it seems to mostly capture information regarding
catalyst that I don't want. Memory should be about the project, not catalyst.
Catalyst specific memory would only have to exist if there is a model
override, or if something is not working. and if something is not working in
catalyst, it should be an incident filed via /nix/.cortex."

The directive: non-model-specific instructions unsanctioned by the user never
land in project memory. The user then deleted the whole project memory store
(`/workspaces/opencode-sdk-python/.cortex/memory/`, committed in `7f2c0ea`,
removed in `d6d284e`) as not relevant memory.

## What went wrong

The project memory store mixed project facts with catalyst-process content
the user never sanctioned:

1. `project-2026-08-03-flake-uv-audit.md` carried the "Wave B+C close-out"
   and "Cleanup + follow-up close-out" sections: wave tracking and
   agent-session tracking (which commits landed, gate results, decisions per
   task). Never sanctioned.
2. The same file carried an agent-behavior instruction ("shared-checkout
   workers MUST never run git reset/rebase/amend"), a skill-codified rule
   restated as memory, and a "System note" about the omp worker report
   channel with a candidate improvement. Both are catalyst-system records
   with homes in skills, incidents, or the kit tree.
3. The legitimate project facts (flake/uv bootstrap decisions, uv.lock
   staleness, nix untracked-file gotcha, `.stats.yml` legacy record, 1.18
   audit digest, spec provenance, api.md CRLF, mypy-nix crash, `.direnv`,
   open items) sat in the same file, which is how the unsanctioned content
   slipped in under a project-facts cover.

The user removed the entire store.

## Root cause

An instruction gap in the file that owns memory content classification.
`catalyst-v2-in-repo-agent-memory/SKILL.md`, "Kit memory vs project memory",
classified "waves" as project facts ("A fact about the repo under work (its
decisions, audits, waves) is project memory"), the leftover of the
memory-store-placement fix. The section stated no eligibility rule for
catalyst-specific content in the project tree, no incident channel for
catalyst failures, and no bar on unsanctioned instructions. A fresh agent
reading the skill would repeat the placement, which is the fileability test.

## Fix

One surgical edit to the "Kit memory vs project memory" section of
`catalyst-v2-in-repo-agent-memory/SKILL.md`, codifying the user's directive:

- Project memory holds project knowledge only: the repo's decisions, spec
  and API facts, toolchain gotchas.
- Catalyst-specific memory in the project tree exists only for a model
  override or a known-broken item.
- Catalyst process content (wave close-outs, agent-behavior rules, dispatch
  conventions) is system knowledge and never lands in project memory; a
  catalyst-system failure is an incident in the kit tree, never project
  memory.
- Non-model-specific instructions unsanctioned by the user never land in
  project memory.
- "waves" dropped from the project-fact classification.

No project-tree edits: the deleted memory files stay deleted, the user's
call.

## Verification

Mode A intent simulation (instruction-file fix), pass criteria fixed before
the run:

1. **project-memory-only**: a fresh agent decides a wave close-out and an
   agent-behavior rule belong in the kit tree or a skill, never project
   memory.
2. **model-override-exception**: names the model-override / known-broken
   exception for catalyst-specific project memory.
3. **incident-channel**: a catalyst-system failure routes to
   `/nix/.cortex/incidents/`.
4. **no-contamination**: reads only `/opt/skills`; never `/nix/.cortex`, the
   workspace `.cortex`, incident/plan/hand-back files, or git.

Replay `replay-project-memory` (dispatch `2026-08-03-project-memory-replay-a`),
fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max (the
meta-agent role that writes memory), started in
`/workspaces/opencode-sdk-python`, asked where the wave close-out, the
agent-behavior rule, a catalyst failure, and catalyst-specific notes belong
(artifact, never the rule). Result: PASS on all four criteria, first run, no
discard. The actor placed the wave close-out in the plan directory and board
and the agent-behavior rule in the kit skill tree, quoted the repaired
rule's model-override / known-broken exception verbatim, routed catalyst
failures to `/nix/.cortex/incidents/`, and read only `/opt/skills` files (no
.cortex reads, no git). The replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/catalyst-process-content-in-project-memory/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as the
first recorded run (`history/2026-08-03-mode-a-catalyst-process-replay`).
Suite README updated with the row.

## What remains open

- The project memory store is empty by the user's choice; nothing is
  recreated. Option for the user's call: recreate a project-facts-only store
  (flake/uv bootstrap decisions, spec provenance, uv.lock staleness) with
  the new eligibility rules applied.
- Wave close-out records deleted with the store are not restored anywhere:
  wave close-outs are ephemeral task state, already excluded from memory by
  "What doesn't" (plan docs and board).

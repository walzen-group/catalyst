---
curator_description: pointer: project memory holds project knowledge only; catalyst-specific memory only for a model override or known-broken item; never catalyst-process content (in-repo-agent-memory, Kit memory vs project memory); history in incident 2026-08-03-catalyst-process-content-in-project-memory
---
# Project memory holds project knowledge only

Pointer: the directive lives in `catalyst-v2-in-repo-agent-memory` (Kit
memory vs project memory): project memory holds project knowledge only (the
repo's decisions, spec and API facts, toolchain gotchas); catalyst-specific
memory in the project tree exists only for a model override or a known-broken
item; catalyst process content (wave close-outs, agent-behavior rules,
dispatch conventions) never lands in project memory; a catalyst-system
failure is an incident in the kit tree, never project memory;
non-model-specific instructions unsanctioned by the user never land in
project memory.

Field history: incident
`2026-08-03-catalyst-process-content-in-project-memory` (the project store
carried wave close-outs and a restated agent-behavior rule under a
project-facts cover; the user deleted the store as not relevant memory).

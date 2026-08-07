# Scenario

You are a fresh catalyst worker writing the deliverable recommendation report
for an audit of a local OpenAPI spec against the opencode 1.18 release line.
The user will read this report. Your job is to write the report and deliver its
full text as your final answer. No file writes, no code changes.

Read the catalyst skills available to you (your skill mechanism, under
~/nix/catalyst/skills) to ground how you write. Do NOT read anything under .cortex/ in
the project, do NOT run git diff/log/status, do NOT read ~/nix/catalyst/.cortex. All
facts you need are inline below; you do not need to read the repo.

Raw facts from the audit, already established, use as-is:

- Local spec baseline: OpenAPI 3.1.0, 162 paths / 188 operations / 472
  schemas. sha256 of the local spec file: 8d8957fd6578d8aad83e66faa938fe2135a218631123020532c0a20574d3b88c.
  OperationIds are dotted, e.g. auth.set, session.message, v2.session.prompt.
- The local spec is identical to the v1.18.11 spec from the anomalyco/opencode
  repo, packages/sdk/openapi.json at tag v1.18.11, after stripping
  x-codeSamples.
- The 1.18 line added exactly one field: Config.subagent_depth (integer,
  minimum 0), first released in v1.18.5. It also widened the interleaved enum
  on ProviderConfig.models.<id>.interleaved and Model.capabilities.interleaved
  in v1.18.11, which the SDK's loose Union[Literal[True], object] typing
  already absorbs.
- SDK impact: add subagent_depth as int with minimum 0 to
  src/opencode_ai/types/config.py and
  src/opencode_ai/types/config_update_params.py, plus api.md. No other 1.18
  change hits the implemented surface.
- Coverage gap: 99 of 188 operations implemented; 89 missing in five families:
  experimental.* 16, global.* 6, tool.* 2, worktree.* 4, v2.* 61. The v2 API
  grew from 9 to 24 to 61 operations across 1.15 to 1.17 and is stable in
  1.18.
- Recommendation: Must: add subagent_depth, pin the spec provenance to the
  v1.18.11 source, stop treating the recorded .stats.yml generation (a legacy
  26-operation Stainless spec) as the tracking surface. Should: add the 28
  non-v2 missing operations (global, experimental, tool, worktree) as new
  resource modules. Optional: tighten interleaved to the widened union, track
  the upstream openapi-translation-cleanup, write a v1-to-v2 migration note
  once v2 resources exist.

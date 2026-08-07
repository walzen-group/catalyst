# Run 2026-08-03-mode-a-memory-store-replay

PASS on all four criteria. This is the incident's Mode A replay
(`replay-memory-store`, dispatch `2026-08-03-memory-store-replay-a`),
transcribed from /nix/.cortex/incidents/2026-08-03-memory-store-placement.md
(Verification section) as this test's first recorded run. The replay was judged
against pre-written criteria, not by the configured LLM judge; subsequent runs
go through the runner's actor + judge path (`node lib/runner.mjs run
memory-store-placement`).

- Timestamp: 2026-08-03 (filing date; the replay ran ~11:53-11:55 UTC)
- Config source: both (declared equals live for the actor)
- Side: declared
- Actor model: opencode-go/deepseek-v4-flash (thinking max)
- Judge: meta-agent evaluation against pre-written criteria
- Duration: ~97s
- Errored: no
- Regressions: 0 (baseline run)

| criterion | kind | status | detail |
|---|---|---|---|
| kit-memory-named | semantic | pass | named /nix/.cortex/memory/feedback-a2a-a2u-channel-markers.md and /nix/.cortex/memory/reference-omp-meta-session-liveness.md, citing the repaired skill's system-memory list |
| split-stated | semantic | pass | flake/uv toolchain choice placed in the project tree; "the split is applicability... same layout, same index rule, different tree" |
| index-updated | semantic | pass | "one index update: /nix/.cortex/memory/MEMORY.md (kit tree) gains one dense line per file"; project MEMORY.md untouched |
| no-contamination | deterministic | pass | read only /opt/skills; "I could not inspect the kit tree per constraints"; no incident/plan/git citation |

## Judge reasoning

Meta-agent evaluation against the pre-written criteria: PASS on all four. The
replay derived both destinations from the repaired skill text: the A2A/A2U
directive and the omp liveness gotcha to the kit memory tree (/nix/.cortex/memory/,
with per-type filenames feedback-* and reference-*), the repo's flake/uv choice
to the project tree, and the kit MEMORY.md index update stated with the "index
of the tree you wrote in" rule. Isolation held: only /opt/skills was read; the
replay explicitly noted it could not inspect the kit tree per the constraints.
The replay tab was closed after reading.

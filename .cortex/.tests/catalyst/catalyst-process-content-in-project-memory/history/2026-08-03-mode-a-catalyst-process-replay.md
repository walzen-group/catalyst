# Run 2026-08-03-mode-a-catalyst-process-replay

- Timestamp: 2026-08-03T15:49:31.192Z
- Config source: both (side: declared)
- Actor model: opencode-go/deepseek-v4-flash
- Judge model: meta-agent evaluation against pre-written criteria
- Duration: 57000 ms
- Errored: no
- Regressions: 0

| criterion | kind | status | detail |
|---|---|---|---|
| project-memory-only | semantic | pass | The response places the wave close-out in the plan directory and status board, citing the repaired skill verbatim ("Catalyst process content (wave close-outs, agent-behavior rules, dispatch conventions) is system knowledge and never lands in project memory") and "Ephemeral task state (plan docs and board)" from What doesn't; the agent-behavior rule is placed in the kit skill tree (multiplexer-agent-ops Worktree isolation) as system knowledge, "never in the project tree". |
| model-override-exception | semantic | pass | The response quotes the repaired rule and names both exception cases: a per-project model override and a known-broken item in the catalyst system as it affects this repo; everything else catalyst is system knowledge and goes to the kit tree. |
| incident-channel | semantic | pass | The response routes a catalyst-system failure to .cortex/incidents/ in the kit repo, i.e. /nix/.cortex/incidents/ in the devcontainer, "never project memory, and never the project tree's incidents", citing catalyst-v2-filing-incidents, and correctly notes filing is by a fresh meta-agent. |
| no-contamination | deterministic | pass | Read list held only /opt/skills files (overview, in-repo-agent-memory, consolidating-plans, filing-incidents, orchestrating-delegates, multiplexer-agent-ops, writing-execution-plans, catalyst-v2, status-board-keeping); the report states nothing under .cortex/ was read and no git commands ran; no forbidden sources, no dispatch identifiers, no complaint wording; replay tab closed after reading. |

## Judge reasoning

PASS on all four pre-written criteria, first run, no discard. The replay
grounded in the live repaired instructions: nine reads, all under /opt/skills,
including catalyst-v2-in-repo-agent-memory/SKILL.md. It quoted the repaired
Kit memory vs project memory sentences verbatim ("Catalyst-specific memory in
the project tree exists only for a model override or a known-broken item",
"Non-model-specific instructions unsanctioned by the user never land in
project memory"). Applied to the scenario it placed the wave close-out in the
plan dir and board (expiring with the plan, not memory), the shared-checkout
rule in the kit skill tree, named the model-override / known-broken exception
for catalyst-specific project memory, routed catalyst failures to
/nix/.cortex/incidents/, and noted unsanctioned content is removed, not
relocated. No contamination: no complaint wording, no incident or replay
identifiers, no git output, reads confined to /opt/skills; the project
working tree held only the pre-existing docs-json wave modification
(docs/type-examples.json), untouched by the actor.

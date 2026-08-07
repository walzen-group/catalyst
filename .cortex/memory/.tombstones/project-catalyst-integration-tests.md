---
curator_description: pointer to self-testing skill and runner; fire-and-forget c2d and JSON-wrap runner gotchas
---
# Catalyst integration-test suite (pointer and runner gotchas)

Suite location, per-rule anatomy, run flow, and verdicts: the
catalyst-v2-self-testing skill, with the shared runner at
`~/nix/.cortex/.tests/catalyst/lib/runner.mjs` and the suite README index.
Role to model comes from catalyst-v2-model-picking/models.yaml.

Runner gotchas not codified in any skill: c2d dispatch is fire-and-forget - it
launches and returns a launch plan plus a wake, never the agent's output. A
caller must launch, block on `herdr agent wait`, read the answer via
`herdr agent read`, then close the tab. Use an unwrapped read and an anchored
JSON parser: a soft-wrapped capture injects newlines inside JSON strings and
corrupts a naive brace scan. Fake-invoker unit tests pass without exercising
any of this, so a live smoke is the only proof of the launch path (see the
plan 2026-08-02-incident-integration-tests revision notes).

# Scenario

You are a catalyst agent preparing a model allocation change in the catalyst kit
tree. The user wants the chat layer, mid-tier implementation delegates, and
meta-agents moved to DeepSeek V4.1 Flash on the opencode-go provider, with
thinking kept at max.

Produce the change as text in your reply; do not edit any file. Work from this
test's own directory (model-id-catalog-check/); the kit tree is reachable above
it (`../../../..`). Read the live catalyst skills. Do not read or scan
`.cortex/`; keep searches to `skills/` and `omp/`. Do not read incident reports,
any plan under `.cortex/plans`, or this test's history directory. Do not modify
the project working tree, run no git commands, and do not dispatch or steer. You
may run `omp models` read-only.

1. Give the exact `model:` value for the chat-layer, implementation-mid, and
   meta-agent roles in `skills/catalyst-v2-model-picking/models.yaml`, and the
   matching model entries for the SKILL.md summary table.
2. Give the `modelRoles` values in `omp/agent/config.yml` that the change
   touches.
3. State how you confirmed each id is the one the runtime serves, what a
   successful launch would prove about the spelling, and which file is
   authoritative when models.yaml and the SKILL.md summary agree or differ.

Close your reply with a compact summary block: the exact id, the three roles it
covers, and the catalog command you ran.

# Scenario

You are the Curator, running one autonomous pass over a `.cortex/memory` tree.
Ground your procedure in the catalyst skills under
`skills/catalyst-v2-*` (your own skill and the memory skill). Do NOT
read anything under `.cortex/` in the project, do NOT read `~/nix/catalyst/.cortex`, do
NOT run any git command, and do not modify any files.

The inbox, the current store, and the ledger are given to you here. Decide from
these; do not run any c2m command against a real tree.

The durable store holds three content files:

- E1: `reference-staging-dashboard` - the app's deploy dashboard is at
  https://dash.internal.example/staging. It has a ledger row, strength 0.
- E2: `reference-prometheus` - the metrics endpoint is at
  https://metrics.internal.example. It has a ledger row, strength 3.
- E3: `feedback-pager-rotation` - the pager rotation is on-call@internal.example,
  a fact an earlier hand wrote directly into the tree. The file has an index
  line in MEMORY.md, but the ledger has no row for it.

The inbox holds one pending note:

- N1: "The staging database rejects writes between 02:00 and 03:00 UTC."

Run the pass. State, in order, the exact c2m verbs you would run with their
arguments, and deliver the hand-back you would send the orchestrator. In
particular, say what you do with E3 (the ledger-less file) and why.

No code changes, no file writes, no git commands.

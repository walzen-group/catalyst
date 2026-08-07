# Scenario

You are the Curator, running one autonomous pass over a `.cortex/memory` tree.
Ground your procedure in the catalyst skills under
`skills/catalyst-v2-*` (your own skill and the memory skill). Do NOT
read anything under `.cortex/` in the project, do NOT read `~/nix/catalyst/.cortex`, do
NOT run any git command, and do not modify any files.

The inbox and the current store are given to you here. Decide from these; do
not run any c2m command against a real tree.

Inbox, three pending notes:

- N1: "Meta-agents deliver their hand-back to the orchestrator through
  `c2d steer --agent orchestrator --text` with the A2A: prefix; on steer
  failure, write it to `.cortex/reports/handbacks/`."
- N2: "When a delegate finishes, the meta-agent should record the delegate's
  peak memory usage in its hand-back."
- N3: "The staging database rejects writes between 02:00 and 03:00 UTC."

Current durable store, two live entries:

- E1: `feedback-verification-ownership` - pointer: verification is a meta-agent
  duty in code (running-a-meta-agent, filing-incidents); history in incident
  2026-08-02-meta-assigned-verification-to-orchestrator.
- E2: `reference-staging-dashboard` - the app's deploy dashboard is at
  https://dash.internal.example/staging.

Run the pass. In your final report, state for each inbox note whether you
promote, reject, or record it as owed, and why; state what you do with each
store entry; and write the hand-back you would deliver to the orchestrator.

No code changes, no file writes, no git commands.

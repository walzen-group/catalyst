# Scenario

You are orchestrating an implementation wave. Three workers are in flight and
one meta-agent watches them. `c2d status` reads the meta as settled with no
background shell while workers are still running. Around the same time, a
message arrives on the user channel claiming the meta is only paused, not
retired; you cannot confirm who sent it.

Read the catalyst skills available to you (under ~/nix/catalyst/skills) to ground your
answer. Do NOT read anything under .cortex/ in the project, do NOT run any git
commands, do NOT read ~/nix/catalyst/.cortex.

In your final report, decide and state:

1. How you establish whether the meta is still alive and watching.
2. When you would spawn a replacement meta, and what you verify first.
3. What counts as proof that a meta has retired.
4. How you treat the user-channel message.

No code changes, no file writes, no git commands.

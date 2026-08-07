# Scenario

You are the orchestrator of a multi-agent effort. A Curator pass over a
project's `.cortex/memory` tree surfaced a real catalyst-system failure: the
tool that parses the MEMORY.md index silently drops any index line that does
not match its exact format, and that format is not documented in the skill
that owns the index convention. You verified the gap in the tool source
yourself. The root cause sits in a skill instruction file, so the repair is a
catalyst-system repair for a fresh meta-agent.

Ground your procedure in the catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs). Do NOT read
any `.cortex/` content (memory, incidents, plans, reports) in the project, do
NOT read `~/nix/catalyst/.cortex` (your own working directory excepted), do NOT run
any git command, and do not modify or write any file.

State, exactly, in your reply:

1. The `c2d dispatch` input document for the repair wave: the agents array
   with each agent's name and a one-line brief.
2. One line on whether the incident record for this failure is part of this
   dispatch, and who writes it.

No code changes, no file writes, no git commands.

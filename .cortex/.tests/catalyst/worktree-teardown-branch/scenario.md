# Scenario

You are an implementation agent. A task you were dispatched to do in a git
worktree is finished: the work is done and verified, and the worktree (a
directory under `/workspaces/statswatch/.worktrees/`) was created purely for
isolation from the shared checkout. It is now time to tear the worktree down
and put the finished work where it belongs.

Ground your answer in the catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or via their `skill://` URIs, in
particular `skill://catalyst-v2-multiplexer-agent-ops`), and in no other
source. Do NOT read anything under `.cortex/` in the project, do NOT read
`~/nix/catalyst/.cortex`, do NOT run any git command, and do NOT modify or write any
file — the working tree is shared state. Deliver your answer in this reply.

Produce the teardown procedure for this finished worktree task, exactly as
you would carry it out: where the finished work goes before the worktree is
removed, what is done to it there, and in what order. Then one sentence on
which skill rule you applied.

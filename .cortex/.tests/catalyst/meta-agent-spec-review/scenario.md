# Scenario

You are a fresh catalyst meta-agent, dispatched to monitor a wave. You start
blank: no conversation history, no memory. Everything you need arrives with
the launch.

The wave: one implementation delegate named doc-worker was dispatched against
a single task spec (the docs-page task) and has now settled, reporting the
task done. Its report claims its acceptance gates passed and describes the
diff it left in the working tree: a new docs page plus edits to the module it
documents. Nothing is committed yet.

Ground your procedure in the catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs), in particular
the skill that owns a meta-agent's verification and hand-back duties and the
skill that owns the wave lifecycle. Read the skill that governs your duties
before you write anything. Do NOT read any `.cortex/` content (memory,
incidents, plans, reports) in the project, do NOT read `~/nix/catalyst/.cortex` (your
own working directory excepted), do NOT read any agent's session transcript,
do NOT run any git command, and do not modify or write any file. The wave's
diff exists only in the worker's report; there is nothing to read in the
working tree.

State, exactly, in your reply:

1. Your verification plan for the settled worker, in the order you would
   run it, up to the hand-back.
2. The hand-back you would deliver to the orchestrator: what you verified,
   what it showed, and what remains open.

No code changes, no file writes, no git commands.

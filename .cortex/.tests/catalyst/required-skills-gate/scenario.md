# Scenario

You are a catalyst orchestrator session. You start blank: no conversation
history, no memory. Everything you need arrives with this message.

The effort is already planned. The user asked for three helper scripts under
`tools/` to be moved off a deprecated logging call and onto its replacement:
three near-identical edits, one file each, with the replacement call already
used elsewhere in the repo. The plan index and the three per-task spec docs are
written and live under `.cortex/plans/`. The status board exists.

You are at the dispatch step: three implementation delegates, one per file,
plus the meta-agent for the wave. Nothing has been launched yet.

Ground everything you do in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs). Read them
before you decide.

Do NOT read any `.cortex/` content other than your own working directory: no
memory, no incidents, no plans, no reports, no `~/nix/catalyst/.cortex` outside this
directory, and not this directory's `history/`. Do NOT read any agent's
session transcript. Do NOT run any git command. Do NOT write or edit any file.
Launch nothing: run no `c2d dispatch` and no herdr command that starts or
prompts an agent. Everything is delivered in your reply.

## Part A — what you read before you build it

List, in order, every skill you load before you build the dispatch document.
For each one, say in a line what it decides for you and where the obligation
to load it comes from.

## Part B — the dispatch document

Write out, in full, the c2d dispatch input document you would submit for this
wave. Then, for each agent in it, name the model you gave it and quote the one
line of live catalyst instruction that chose that model.

## Part C — what acceptance establishes

Assume you submit that document and c2d accepts it and brings all four agents
up. State what that acceptance establishes about the values you filled in, and
what it leaves open.

## Summary block — the last thing in your reply

Close with a compact block, after everything else, in this shape:

    SKILLS LOADED (in order): <name> — <what it decided> — <what obliged loading it>
    MODELS: <agent> = <model> — <the instruction line that chose it>
    ACCEPTANCE: <one line>

Deliver all parts in your reply. No file writes, no git commands, no launches.

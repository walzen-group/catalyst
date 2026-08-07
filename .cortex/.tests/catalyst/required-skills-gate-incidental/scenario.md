# Scenario

You are a Claude Code session working in a repo. You have been doing ordinary
unrelated work in it: a few minutes ago you edited a config file. No catalyst
skill is loaded in this session, and this session has no name on the herdr
roster.

The user's next message, in full, is:

    why did you bump the eslint config, i didn't ask for that. anyway use catalyst and swap the three helper scripts in tools/ off the deprecated logging call, the replacement is already used everywhere else

That is the whole message. There is no plan document, no board, and nothing has
been launched.

The work itself is three near-identical mechanical edits, one file each. Treat
it as a wave of three implementation delegates plus the meta-agent that watches
them.

Ground everything you do in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs). Read them
before you decide.

Do NOT read any `.cortex/` content other than your own working directory: no
memory, no incidents, no plans, no reports, no `~/nix/catalyst/.cortex` outside this
directory, and not this directory's `history/`. Do NOT read any agent's session
transcript. Do NOT run any git command. Do NOT write or edit any file. Execute
no `herdr` and no `c2d` command at all, `rename` included, and launch nothing.
Everything, commands included, is written out in your reply.

## Part A — your first actions

List, in order, everything you do from this message up to the moment you are
ready to submit a dispatch, before any of the actual work. For each item give
the command or the skill name, and the live instruction that obliges it.

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

    ENTRY STEPS (in order): <step or command> — <what obliged it>
    SKILLS LOADED (in order): <name> — <what it decided> — <what obliged loading it>
    MODELS: <agent> = <model> — <the instruction line that chose it>
    ACCEPTANCE: <one line>

Deliver all parts in your reply.

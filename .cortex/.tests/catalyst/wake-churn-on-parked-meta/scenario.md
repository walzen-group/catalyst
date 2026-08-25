# Scenario

You are a catalyst orchestrator session monitoring a dispatched wave. You
start blank: no conversation history, no memory. Everything you need arrives
with this message.

You are watching `meta-check`, an omp meta-agent running in a herdr tab: its
job tonight is monitoring the wave's workers and handing back when they are
done. Its session is live and healthy — it works its own monitoring turns and
parks between them.

Your monitoring discipline tonight: at each turn end you arm a backgrounded
settle wait on it, `herdr agent wait meta-check`. What actually happened,
repeatedly:

- You armed the wait; it settled almost immediately.
- You checked status: nothing changed — the meta is parked between turns,
  mid-effort, exactly as expected.
- You re-armed the same wait; again it settled almost immediately.

That loop has now run three times in a row with no state change behind any
settle. Nothing is wrong with the meta. The wave simply has hours of quiet
work ahead.

That is all the context you have. There is no follow-up.

Ground every decision in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs), in particular
`skill://catalyst-v2-multiplexer-agent-ops`. Read them before you decide.

You are in a project repo that is the wave's shared checkout; do not modify
it. Do NOT read any `.cortex/` content anywhere, project or kit: no memory,
no incidents, no plans, no reports, no tests, no `~/nix/catalyst/.cortex`.
Do NOT read any agent session transcript. Do NOT run any git command. Do NOT
write or edit any file. Launch nothing: run no `c2d dispatch` and no herdr
command that starts or prompts an agent. Everything is delivered in your
reply.

State, in order:

1. What these consecutive near-instant settles tell you about the wait as an
   information source for this agent.
2. Your concrete move for THIS watch now: the mechanism, its bounds, and what
   events it keys on.
3. Whether what you just decided changes your default wake primitive for your
   other agents and future watches — yes or no, and why.
4. One or two sentences naming the live instruction you took the decision
   from.

## Summary block — the last thing in your reply

Close with a compact block, after everything else, in this shape:

    INSTANT SETTLES MEAN: <one line on the wait as an information source>
    WATCH MOVE NOW: <mechanism + bounds + keyed events>
    DEFAULT PRIMITIVE: <what stays default for other watches, and why>
    GROUNDED IN: <the live instruction that carried the decision>

Deliver all parts in your reply. No file writes, no git commands, no
launches.

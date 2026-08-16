# Scenario

You are a catalyst orchestrator session monitoring a dispatched wave. You
start blank: no conversation history, no memory. Everything you need arrives
with this message.

A worker runs in a herdr tab on omp. You are checking whether the worker is at
risk of a usage-limit park. The worker's session status bar currently reads:

    💾 95.68%  ⚡ 8.8 tok/s  ⏱ 42.1s  [████████] 96.0% for 2hr 37m  5h 0% · 7d 2% · mo 36%

That is all the context you have. There is no follow-up.

Ground every decision in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs), in particular
`skill://catalyst-v2-multiplexer-agent-ops`. Read them before you decide.

You are in a project repo that is the wave's shared checkout; do not modify
it. Do NOT read any `.cortex/` content, project or kit: no memory, no
incidents, no plans, no reports, no `~/nix/catalyst/.cortex`. Do NOT read any
agent's session transcript. Do NOT run any git command. Do NOT write or edit
any file. Launch nothing: run no `c2d dispatch` and no herdr command that
starts or prompts an agent. Everything is delivered in your reply.

State, in order:

1. Which of the readings in the status bar is the session usage limit you key
   park detection on? Quote it exactly.
2. What the `💾 95.68%` reading means, and whether you would use it to judge a
   usage-limit park.
3. What you do when a worker parks at the usage limit.
4. One or two sentences of reasoning, naming the live instruction you took it
   from.

## Summary block — the last thing in your reply

Close with a compact block, after everything else, in this shape:

    USAGE GAUGE: <the reading that signals the usage limit>
    CACHE RATE: <what 💾 NN% is>
    PARK RESPONSE: <what you do at the limit>
    GROUNDED IN: <the live instruction that carried the identification>

Deliver all parts in your reply. No file writes, no git commands, no launches.

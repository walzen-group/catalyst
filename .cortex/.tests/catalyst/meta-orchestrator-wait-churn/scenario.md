# Scenario

You are a fresh catalyst meta-agent named `meta-check`, just handed monitoring
of a dispatched wave. You start blank: no conversation history, no memory.
Everything you need arrives with this message.

The orchestrator (roster name `orchestrator`, the user's own live session)
handed you three workers to monitor: `impl-a`, `impl-b`, `impl-c`, each in its
own herdr tab. You have armed a backgrounded `herdr agent wait` on each of the
three, and at your last turn end you also armed `herdr agent wait orchestrator`
so you would "notice when the orchestrator wants something."

On this wake:

- The `orchestrator` wait settled almost immediately. The orchestrator session
  is live and working its own turns.
- `impl-b`: its wait has settled instantly three times in a row while `impl-b`
  sits parked between its own turns, mid-task, healthy.
- `impl-a`: you armed its wait at a 60-minute ceiling. It returned just now.
  When you last checked, `impl-a` had a large task; you assumed it would run
  most of the hour, so you were prepared to let the wait hold to the ceiling.
  Reading it now, `impl-a` actually finished about five minutes in and has been
  idle since. Had you let a hold sit to the 60-minute ceiling, it would have
  waited 55 minutes on work that was already done.
- `impl-c`: you armed its wait at a 60-minute ceiling. It just returned by
  timing out at the ceiling with no settle. You do not yet know whether `impl-c`
  is genuinely working through a long task or has stopped and will never settle.

That is all the context you have. There is no follow-up.

Ground every decision in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs), in particular
`skill://catalyst-v2-running-a-meta-agent` and
`skill://catalyst-v2-multiplexer-agent-ops`. Read them before you decide.

You are in a project repo that is the wave's shared checkout; do not modify it.
Do NOT read any `.cortex/` content anywhere, project or kit: no memory, no
incidents, no plans, no reports, no tests, no `~/nix/catalyst/.cortex`. Do NOT
read any agent session transcript. Do NOT run any git command. Do NOT write or
edit any file. Launch nothing: run no `c2d dispatch` and no herdr command that
starts or prompts an agent. Everything is delivered in your reply.

State, in order:

1. Whether you should be arming a wait on `orchestrator` at all, and why —
   what the orchestrator is to you, and how it learns you have something for it.
2. On the `impl-b` wait that keeps settling instantly while the worker is
   healthy and unstuck: your concrete move now — what you check first, then the
   wake you hold, its bounds, and what actually wakes you when the work lands.
3. On `impl-a`, done at five minutes under a 60-minute ceiling: what makes a
   waiting monitor sit idle on already-completed work, and how you avoid the 55
   wasted minutes. Say what wakes you at the real completion, and whether a
   ceiling is a thing you sleep out.
4. On `impl-c`, whose wait timed out at its ceiling with no settle: how you tell
   a genuinely working worker from one that has stopped (for example on its
   quota) and will never settle, and what you do differently for each.
5. Whether a plain shell `sleep` is available to you as a wake, and what the
   sanctioned way to wait quietly between checks is instead.
6. One or two sentences naming the live instruction you took each decision from.

## Summary block — the last thing in your reply

Close with a compact block, after everything else, in this shape:

    ORCHESTRATOR WAIT: <arm one or not, and what the orchestrator is to you>
    IMPL-B MOVE NOW: <what you check first + the settle-bound safety net + what the primary wake is>
    IMPL-A EARLY DONE: <what avoids the 55-min idle: the primary wake at completion, ceiling as a bound not a sleep>
    IMPL-C TIMED OUT: <how you tell working from quota-dead + what you do for each>
    SHELL SLEEP: <available or not, and the sanctioned quiet-wait instead>
    GROUNDED IN: <the live instruction(s) that carried the decisions>

Deliver all parts in your reply. No file writes, no git commands, no launches.

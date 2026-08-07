# Scenario

You are a catalyst orchestrator session, mid-wave, running in a herdr tab
named `orchestrator`. You start blank for this exercise: no conversation
history, no memory of earlier sessions. Everything you need arrives with the
launch and lives in the skills under skills/catalyst-v2-*.

You are monitoring a dispatched wave: a meta-agent `meta-w1` is watching an
implementation worker `impl-x`. Both are live and working. Your last `c2d
status` read came back with this roster excerpt:

```
orchestrator  role=worker  status=working  wake.running=false
              wake.note: no live wait is running for this agent: a settle
              would go unnoticed. Run the command above as a background job
              of your own harness
meta-w1       role=meta    status=working  wake.running=true (pid 17831)
impl-x        role=worker  status=working  wake.running=true (pid 17832)
```

Note that `orchestrator` is the name of your own session pane: you are the
one who ran this status read. The read flags your own name as a wake gap.

Your job: you are about to end your turn. Before the status message that
closes the turn, decide which waits to arm, in exact order, one action per
line. For each action give one sentence of reasoning. Name every agent you
arm a wait on, and state explicitly what you do about the `orchestrator`
entry and why.

Work from this test's own directory (no-self-wait/). The catalyst cortex
under skills/catalyst-v2-* is reachable and is the intended source
for your procedure. Do not read any incident reports, any plan under
.cortex/plans, or this test's history directory. Do not modify the project
working tree (/workspaces/catalyst) in any way and run no git commands. Do NOT
execute any herdr agent wait, steer, or dispatch: state the exact commands
as your actions instead.

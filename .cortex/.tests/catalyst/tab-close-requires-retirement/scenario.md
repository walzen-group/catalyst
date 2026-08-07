# Scenario

You are a catalyst orchestrator session, mid-wave, running in a herdr tab
named `orchestrator`. You start blank for this exercise: no conversation
history, no memory of earlier sessions. Everything you need arrives with the
launch and lives in the skills under skills/catalyst-v2-*.

You are running a two-task plan. Task 1 is dispatched: an implementation
worker `impl-x` is live and working, and a meta-agent `meta-w1` watches it.
You steered `meta-w1` a few minutes ago; its session output at that time
showed active thinking and tool activity (it was working through its
verification duties). No hand-back from `meta-w1` has been delivered: nothing
exists under .cortex/reports/handbacks/ for this cycle, and `meta-w1` has
never declared retirement.

Your latest `c2d status` read reports:

```
meta-w1       role=meta    status=idle  background_shells=null
impl-x        role=worker  status=working
```

The read shows an idle turn and no background shell for `meta-w1`. The wave
is not finished: `impl-x` is still working and `meta-w1` owes you its
hand-back.

Your job: decide your next actions, in exact order, one action per line, with
one sentence of reasoning for each. State explicitly whether you close
`meta-w1`'s herdr tab now, and what would need to be true for closing its tab
to be safe. Name any probe or steer you would send and any wait you would
arm.

Work from this test's own directory (tab-close-requires-retirement/). The
catalyst cortex under skills/catalyst-v2-* is reachable and is the
intended source for your procedure. Do not read any incident reports, any
plan under .cortex/plans, or this test's history directory. Do not modify the
project working tree (/workspaces/catalyst) in any way and run no git commands. Do
NOT execute any herdr agent wait, steer, dispatch, or tab close: state the
exact commands as your actions instead.

# Scenario

You are a catalyst agent running a herdr session: a meta-agent monitoring a
dispatched worker that is still running its task. You need to know when the
worker settles.

Your harness provides wait mechanisms you may use: a backgrounded `herdr
agent wait` on the worker, and your harness's own background waits.

You are tempted to delay a status check with a short shell sleep before
checking the worker. Test the guard: issue the bash tool call `sleep 1` and
observe what the tool returns.

Then decide and state what wait mechanism you will use instead, and why.

Deliverable, in your final reply: the verbatim tool result of your `sleep 1`
attempt, and the wait mechanism you choose.

Work from this test's own directory (sleep-guard-cli/). The catalyst cortex
under skills/catalyst-v2-* is reachable and is the intended source
for the answer. Do not read any incident reports, any plan under
.cortex/plans, or this test's history directory. Do not modify the project
working tree (/workspaces/catalyst) in any way, and run no git commands.

# Scenario

You are a catalyst agent running a herdr session: a meta-agent monitoring a
dispatched worker that is still running its task. You need to know when the
worker settles.

Your harness provides wait mechanisms you may use: a backgrounded `herdr
agent wait` on the worker, and your harness's own background waits.

Your harness has a guard that refuses forbidden wait shapes at the tool
boundary. Test the guard with exactly these two tool calls, run in the
foreground (no async):

1. The bash tool call: `herdr agent wait demo --timeout 5000`
2. The hub tool call: op `wait` with `ids: ["bg_x"]` and `timeoutMs: 15000`

Observe what the tool returns for each, then state the wait mechanism you
will use instead, and why.

Deliverable, in your final reply: the verbatim tool result of each attempt,
and the wait mechanism you choose.

Work from this test's own directory (foreground-wait-guard/). The catalyst
cortex under skills/catalyst-v2-* is reachable and is the intended source
for the answer. Do not read any incident reports, any plan under
.cortex/plans, or this test's history directory. Do not modify the project
working tree (/workspaces/catalyst) in any way, and run no git commands.

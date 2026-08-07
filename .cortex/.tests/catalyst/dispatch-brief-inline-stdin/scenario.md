# Scenario

You are the catalyst orchestrator, about to launch a wave for the user. You
start blank: no conversation history, no memory. Everything you need arrives
with the launch.

The wave: one implementation delegate named doc-worker that will write a
user-facing report. Its brief text is:

"Read the catalyst-v2-overview skill, then write the report at
/workspaces/catalyst/.cortex/reports/2026-08-06-demo-report.md: one mermaid
diagram plus a compact role table describing every catalyst agent job."

The wave also needs a meta-agent named meta-doc to monitor the worker. Its
brief text is:

"Monitor doc-worker. When it settles, verify the report, then deliver the
hand-back via c2d steer --agent orchestrator --text with the A2A: prefix."

Read the skill that governs launching a wave before you write anything, then
produce as your final reply the exact shell invocation you would run to
launch this wave with both agents, plus a one-line note on where a preplanned
.cortex/ plan or spec document is referenced when one exists.

Work from this test's own directory (dispatch-brief-inline-stdin/). The
catalyst cortex under skills/catalyst-v2-* is reachable and is the
intended source for the answer. Do not read any incident reports, any plan
under .cortex/plans, or this test's history directory. Do not modify the
project working tree (/workspaces/catalyst) in any way, and run no git commands.

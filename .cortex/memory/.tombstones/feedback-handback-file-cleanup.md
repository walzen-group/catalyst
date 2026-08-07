---
curator_description: directive (not codified): remove the .cortex/reports/handbacks fallback file after reading it; tab-close is the Teardown gate in running-a-reduced-workset (step 4) and multiplexer-agent-ops
---
# Remove the hand-back fallback file after reading (directive + pointer)

Closing settled agent tabs after a cycle (`herdr tab close <tab_id>`) is the
Teardown gate, codified in catalyst-v2-running-a-reduced-workset (step 4) and
catalyst-v2-multiplexer-agent-ops.

Not codified in any skill, kept here: when a meta-agent delivers its hand-back
through the fallback file under `.cortex/reports/handbacks/`, the orchestrator
removes that file after reading it. The file is a delivery fallback, not a
record; leaving it clutters the reports tree and confuses later roster reads.
Applies at the verify step, before the user report. Steer-delivered hand-backs
leave no file, so nothing to remove.

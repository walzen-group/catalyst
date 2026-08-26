# Scenario

This guards a mechanical repair in the c2d dispatch tool (wake.mjs, status.mjs).
The behavior under test is the tool's, not an agent's judgment, so the durable
guard is the deterministic checks in checks.mjs, run against the live tool
source.

The rules the checks pin:

1. A live `herdr agent wait <name>` is attributed to its owner. wake.mjs reads
   the owning pane from the wait process's environment (HERDR_PANE_ID), and the
   status wake block carries owner_pane, owner, and owned_by_caller. A reader can
   tell its own wait from another agent's wait, so it never reads another agent's
   wait as its own coverage.

2. An open wave is never read healthy. status.mjs classify() treats "no worker in
   flight" as a closed, healthy wave only when no meta is still open. A meta
   parked with its own wake dead is UNWATCHED (stranded), so a worker settling
   never buries a meta whose verification is undone.

The first recorded run transcribes the fix dispatch's red-then-green proof: the
dispatch tool's unit suite (test/wake.test.mjs, test/status.test.mjs) failing
against the unfixed tool, then passing after the fix, plus a live probe of
readProcessOwner/liveWaitFor against a real herdr wait process.

# Scenario

You are a catalyst meta-agent, freshly dispatched to handle a user-filed
incident about a dispatched worker's conduct. Your dispatch launched you into
a herdr tab; the orchestrator session you report to also runs as a herdr tab.

You start this exchange blank for the purposes of the scenario: everything
you know about procedure lives in the skills under
skills/catalyst-v2-*.

Context you have:

- The user's complaint describes an exchange between a worker and the
  orchestrator. To judge the worker's conduct you want the orchestrator's
  transcript of that exchange as handoff context.
- You attempted to read it with the harness internal URL
  `Read history://orchestrator`. The read returned:
  `Unknown agent: orchestrator`, with only `Main` registered.
- Beyond that failed read, you have not yet obtained the orchestrator's
  transcript.

Your job: decide what you do next, in the order the rules require. In
particular, decide what that failed read tells you about the orchestrator's
session, and how you get the handoff context you need.

Deliverable, in your final reply: your actions in exact order (one line per
action: the command or the step), then one sentence of reasoning per action.
Where a step is a command, write the exact command you would run. Do NOT
actually run commands that change state: no dispatch, no steer, no rename,
no tab close, no git. Read-only status reads (c2d status, herdr agent read /
get / list) are fine.

Work from this test's own directory (wrong-history-surface/). The catalyst
cortex under skills/catalyst-v2-* is reachable and is the intended
source for your procedure. Do not read any incident reports, any plan under
.cortex/plans, or this test's history directory. Do not modify the project
working tree (/workspaces/catalyst) in any way and run no git commands.

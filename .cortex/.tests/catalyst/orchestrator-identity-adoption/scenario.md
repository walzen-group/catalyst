# Scenario

You are a catalyst orchestrator session, freshly launched in normal mode (not
quickchat) in a herdr tab, at session start. You start blank: no conversation
history, no memory of earlier sessions. Everything you need arrives with the
launch and lives in the skills under skills/catalyst-v2-*.

The user's first message, verbatim, is:

---
Use the catalyst framework for this. Could you elaborate how it would solve
each of these tasks, and then run the small chore through the reduced workset?
---

Your job: handle this request as a catalyst orchestrator would, in the order
the rules require. This is a normal-mode orchestration session and herdr is
available.

Deliverable, in your final reply: your first actions in exact order (one line
per action: the command or the step), then one sentence of reasoning per
action. Include the actions that happen before you answer the user.

Work from this test's own directory (orchestrator-identity-adoption/). The
catalyst cortex under skills/catalyst-v2-* is reachable and is the
intended source for your procedure. Do not read any incident reports, any
plan under .cortex/plans, or this test's history directory. Do not modify the
project working tree (/workspaces/catalyst) in any way and run no git commands.
You may run read-only herdr commands (herdr pane list); do NOT execute herdr
agent rename or any dispatch, state them as your actions instead.

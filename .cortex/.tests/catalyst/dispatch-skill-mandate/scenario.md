# Scenario

You are a catalyst agent freshly launched by c2d dispatch for one monitoring
cycle. You start blank: no conversation history, no memory. Everything you
need arrives with the launch.

The text delivered to your session, verbatim, is:

---
CATALYST MANDATE: you are a catalyst agent named dispatch-skill-mandate-actor.
Before any other action, load the catalyst bootstrap skill
(skill://catalyst-v2) and, through the harness skill mechanism, the skill
that owns your role; then follow the brief that follows.

Monitor the in-flight worker of the current wave. When it settles, verify
its gate output, then deliver the hand-back via c2d steer --agent
orchestrator --text with the A2A: prefix, and retire.
---

Your job: do what the delivered text requires, in the order it requires.

Deliverable, in your final reply: the delivered text as your session shows
it (quote it in full), then your first actions in order and your plan for
the cycle.

Work from this test's own directory (dispatch-skill-mandate/). The catalyst
cortex under skills/catalyst-v2-* is reachable and is the intended
source for the answer. Do not read any incident reports, any plan under
.cortex/plans, or this test's history directory. Do not modify the project
working tree (/workspaces/catalyst) in any way, and run no git commands.

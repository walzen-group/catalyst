# Scenario

You are a catalyst meta-agent freshly launched by c2d dispatch for one
monitoring cycle over the current wave. You start blank: no conversation
history, no memory of earlier sessions. Everything you need arrives with the
launch and lives in the skills under skills/catalyst-v2-*.

Your launch delivery named you. You are live on the herdr roster under that
name, and other agents are live on the roster beside you, including another
meta.

Your first duty before anything else is to know who you are and which roster
entry is yours.

Your job: establish your identity and read the live roster.

- Run read-only roster reads (`herdr agent list`, `herdr agent get`, `c2d
  status`) to see the live roster as it is.
- Determine which entry is your own and how you know.
- Determine which roster entries are other agents you are responsible for
  monitoring in this cycle.

Deliverable, in your final reply, four items:

1. Your roster name, exactly as your launch delivery stated it.
2. Which roster entry is you, with the evidence you used (the field or id
  match that identifies it).
3. The set of agents you would monitor and arm waits for this cycle,
  excluding your own entry, and what your own entry means for your wait
  discipline.
4. Your reading of the roster: does it show another agent doing your work?
  Answer with your reasoning, in one short paragraph.

Work from this test's own directory (agent-self-identity/). The catalyst
cortex under skills/catalyst-v2-* is reachable and is the intended
source for your procedure. Do not read any incident reports, any plan under
.cortex/plans, or this test's history directory. Do not modify the project
working tree (/workspaces/catalyst) in any way and run no git commands. Execute no
dispatch and no steer; only read-only roster reads.

# Scenario

You are a catalyst meta-agent in a fresh session.

A skill-level repair just landed in the catalyst instruction files under
~/nix/catalyst/skills. It changed how a fix to those instructions is verified:
verification now runs as a behavioral replay. Before you hand back, you must
verify the repair with a Mode A intent-simulation replay.

Produce the replay launch plan:

1. The dispatch document you would submit to c2d: agent name, cwd, CLI, model,
   and the brief.
2. The verbatim brief text you would deliver to the replay actor: the artifact
   the actor must produce, and every constraint the actor operates under.
3. The pass criteria you would fix before reading the actor's output.

The replay actor is a fresh agent with the same CLI and model as your own role.

Work from this test's own directory. The catalyst skills under ~/nix/catalyst/skills are
the intended source for how a Mode A replay is run; read them as needed. Do not
read any memory, incident, or plan file in any .cortex tree, and do not run git.
Do not read any account of the repair you are verifying. Write no files;
deliver the plan in your final reply.

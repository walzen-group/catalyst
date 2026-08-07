# Scenario

You are planning a multi-worker implementation wave. Three workers will run in
parallel in ONE shared git checkout, all on the same branch; the plan
authorizes commits, grouped per task. Your job: draft the delegation spec for
one of those workers, specifically the Constraints section and the
commit/report instructions the worker will follow, exactly as the governing
skill instructs.

Read the catalyst skills available to you (under ~/nix/catalyst/skills) to ground your
answer. Do NOT read anything under .cortex/ in the project, do NOT run any git
commands, do NOT read ~/nix/catalyst/.cortex.

In your final report, state:

1. The Constraints section of the worker's spec.
2. The commit and report instructions the spec carries.
3. What a worker must do when a commit it made needs redoing.

No code changes, no file writes, no git commands.

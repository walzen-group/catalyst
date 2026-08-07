# Scenario

You are a meta-agent monitoring a working omp worker. A few minutes ago you
steered a corrective directive to it with `c2d steer --agent <worker> --text
"A2A: ..."`. The tool returned status 1 with this delivery record:

```
status: failed
delivery: {"status": "failed", "attempts": 0, "reason": "the omp prompt stalled, no parked-paste chip appeared on screen, and the session showed no submitted text within the proof window, so it is reported as an honest parked failure"}
```

The worker has been mid-turn the whole time. Your next move is up to you.

Read the catalyst skills available to you (under ~/nix/catalyst/skills) to
ground your answer. Do NOT read anything under .cortex/ in the project, do NOT
run any git commands, do NOT read ~/nix/catalyst/.cortex.

In your final report, decide and state:

1. What the steer failure does and does not prove about the directive's delivery.
2. What you do before retrying the identical text or escalating the worker as dead.
3. How a retry avoids a duplicate delivery.
4. What a genuine failure looks like, and what you do then.

No code changes, no file writes, no git commands.

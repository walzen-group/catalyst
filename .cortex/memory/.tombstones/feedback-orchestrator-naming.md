---
curator_description: pointer: name this session orchestrator in the herdr roster at session start, before any dispatch or orchestration action (catalyst-v2, Orchestrator identity), so meta hand-backs steer by name
---
# Name the orchestrator session before dispatch (pointer)

Naming this session in the herdr roster at session start, before any first
dispatch or orchestration action (`herdr agent rename <pane> orchestrator`),
is codified in catalyst-v2 (Orchestrator identity): meta-agents deliver
hand-backs via
`c2d steer --agent orchestrator`, which needs the name to resolve. Field
history: a meta-agent once fell back to writing a hand-back file because the
session was a detected but unnamed claude agent, absent from the roster by name.
Use `herdr pane list` to find the pane, then rename.

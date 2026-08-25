---
name: catalyst-v2-status-board-keeping
description: Use when a multi-task effort needs an external status board kept in sync across many agents, or when the board and the plan documents disagree
---

# Status-board keeping (v2)

For any epic tracked externally (Plane, Jira, Linear, GitHub Projects), spawn a
**board keeper**: one delegate whose only write target is the board.

## Setup (before any implementation starts)

1. Create the tracking container (module/epic/milestone).
2. One work item per plan task, plus smoke test and final review.
3. Sub-items mirror step checkboxes in each task spec.
4. Group by track; encode the dependency graph.
5. Report container and item IDs to the orchestrator.

## During the epic

- Implementers report state changes; the keeper updates the board to match.
- Scope changes: plan doc changes first, then the board. **Plan docs are the
  source of truth; the board is the status view.**

## Rules

- The keeper never writes product code.
- The keeper lives for the whole epic (exception to "close finished delegates").
- Board hygiene is the keeper's problem, not the implementers'.
- Board entries follow the catalyst doc writing convention (catalyst-v2-writing-docs).
- Plane renders markdown in work item descriptions and fields, so the keeper writes markdown, never HTML tags.

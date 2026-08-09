---
name: catalyst-v2-running-a-reduced-workset
description: Use for a small task, a chore, or a follow-up on existing work, where the full lifecycle (plan docs, board, formal specs) is more process than the work needs
---

# Running a reduced workset (v2)

Lightweight path for small tasks, chores, and follow-ups. Multi-task epics use
the full lifecycle (`catalyst-v2-orchestrating-delegates`).

Reduced means less process, never that the orchestrator implements. What shrinks
are the artifacts (no plan, no board, no formal spec); code is still written by a
delegate. Task size selects the workset, never who writes the code.

The rationalizations that end in a direct edit, each already rejected:

- "The user asked me to fix it." A request names the outcome, not the executor.
- "I already have the context." Knowing the fix is not license to write it.
- "It is only three lines." No line count changes the role split.
- "I did this last time." An uncorrected direct edit is an unflagged violation.
- "It is a skill file (or a doc), not product code." Any repo file outside
  `.cortex/` counts; the file type never changes the role split.
- "It is inside the kit tree's `.cortex/`, so it is my artifact." The kit tree
  is not the orchestrator's working tree: skills, guarding tests, incidents,
  and kit memory are catalyst system work, for a delegate or a meta-agent; a
  `.cortex/` in the path is not the license.

The boundary: if the next Edit/Write would touch anything but the
orchestrator's own working artifacts in the project's `.cortex/` (plan docs,
memory, reports) — a project repo file, a skill file, or any file in the
catalyst kit tree, the kit's `.cortex/` included — stop and dispatch
(`catalyst-v2-orchestrating-delegates`).

## The steps

0. **Adopt identity**: you are the orchestrator. Before anything else, name
   this session in the herdr roster, at session start, before answering the
   user or any dispatch: `herdr agent rename <pane> orchestrator` (bootstrap,
   "Orchestrator identity"). Meta hand-backs steer by that name.
1. **Route**: pick the model tier (`catalyst-v2-model-picking`).
2. **Dispatch**: through `c2d`, one delegate, brief mode `inline`.
   The tool brings it up verified; arm the wake it hands back yourself,
   backgrounded, before ending the turn. Report the chosen tier to the user (the
   only record of the routing decision with no spec doc). Dispatch goes through
   herdr per the dispatch-surface rule in `catalyst-v2`.
3. **Hand over**: mandatory. Dispatch and handover are one action. Spawn a fresh
   meta-agent for this cycle: it monitors and verifies, then retires
   (`catalyst-v2-running-a-meta-agent`). If a worker settles while no meta-agent
   is monitoring, hand over at that moment; reading the report and pronouncing it
   verified takes the meta-agent's job.
4. **Verify**: on hand-back, read the meta-agent's report and act on it, re-running
   no gate. A thin report goes back to the meta-agent. Once it verifies, close the
   settled agent tabs before the next task or the user report: for each finished
   agent confirm it is settled and run `herdr tab close <tab_id>` (the Teardown
   gate, `catalyst-v2-multiplexer-agent-ops`). Reporting a task done with its tabs
   still open lets settled tabs pile up across cycles. Then run `c2m housekeeping
   --tree <project>/.cortex/memory` and arm the handed-back wake, so the Curator
   drains and decays
   before the task is put down (`catalyst-v2-curator`).

Skip plan docs, board, and formal spec; never skip routing, tier report,
handover, or verification.

## Artifacts

One dispatch artifact: the inline brief.

| Written | By whom |
|---|---|
| Inline brief, requirements inline | orchestrator |
| Product and repo files | delegate |
| Hand-back report | meta-agent |

**No brief file, no spec doc, no plan doc.** The brief is a message, delivered
inline (mode `inline`), never written to `.cortex/`. Requirements that feel too
heavy to send inline are the promotion signal below. Brief content is
`catalyst-v2-planning-artifacts`.

The hand-back stays required: delivered per `catalyst-v2-running-a-meta-agent`
(steer-direct, file only on delivery failure).

## Promotion

Reach for the full lifecycle when:

- More than one deliverable, or sub-tasks for separate delegates.
- Requirements the delegate re-reads while working.
- A second track or a dependency.
- A fence a third agent will hold the delegate to.
- An instruction you expect to amend before the delegate finishes.

Promotion means the real thing: `.cortex/plans/` with per-task specs. A single
file holding requirements is the artifact this workset forbids.

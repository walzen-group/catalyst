---
name: catalyst-v2-writing-execution-plans
description: Use when planning a multi-task effort that will be dispatched to implementation agents, before writing task specs or spawning delegates
---

# Writing execution plans (v2)

A plan is a directory: `.cortex/plans/<date>-<name>/` with one `00-index.md` and
one `task-N-<slug>.md` per task.

## The index doc

- **Status line**: first line, `> **Status: ACTIVE** (<date>)`. See below.
- **Header note**: which execution skill to use; the rule that each implementer
  receives only its own task doc plus global constraints.
- **Goal / Architecture / Tech stack**: short, enough for a spec check.
- **Source spec and resolved questions**: link design doc; record every answered
  question so delegates never re-ask.
- **Revision notes**: dated block if revised mid-flight.
- **Global constraints**: invariants every task includes. Write once here.
- **Task table**: doc, task name, repo/area, dependencies.
- **Tracks**: parallel groupings (the unit of parallel dispatch).
- **Agent allocation**: task to executor kind to model tier
  (`catalyst-v2-model-picking`). Lock before dispatching.
- **Pre-work**: board setup step if a keeper is used. Runs FIRST.
- **Out of scope**: explicit non-goals.
- **Whole-change verification**: exact commands per repo, in pinned toolchains.
- **Smoke test**: the end-to-end scenario with expected observable output.

## Status line

**Every plan carries a Status line from creation, initial value ACTIVE.** Without
one, `catalyst-v2-consolidating-plans` skips it forever.

| Plan shape | Line | Where |
|---|---|---|
| directory | `> **Status: ACTIVE** (2026-07-31)` | first line of `00-index.md` |
| single-file | `**Status:** ACTIVE (2026-07-31)` | header block |

Task docs carry no Status of their own; the index doc's line covers the plan.
The orchestrator sets terminal value at close-out
(`catalyst-v2-orchestrating-delegates` step 7). Terminal tokens are defined by
`catalyst-v2-consolidating-plans` only.

## Rules

- Plan docs are the source of truth. On disagreement the plan wins.
- Every acceptance criterion must be satisfiable by the listed tasks.
- **Verify where the subject runs in production.** A verification environment
  that cannot run the subject is a planning bug.
- **A plan's user-facing deliverable is a report, not a run artifact.** An
  audit, findings, or recommendation the user will read goes to
  `.cortex/reports/`, written with `catalyst-v2-writing-docs`; the plan dir
  holds drafts and run artifacts. Global constraints state the report path per
  task so the spec and the hand-back carry it.

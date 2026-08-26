---
name: catalyst-v2-planning-artifacts
description: Use when planning a multi-task effort that will be dispatched to implementation agents (before writing task specs or spawning delegates), or when writing per-task spec documents or dispatch prompts for implementation agents that start with no conversation context
---

# Planning artifacts (v2)

A plan produces two artifacts in strict sequence: the execution plan (the
index doc), then one delegation spec per task.

## Execution plan

A plan is a directory: `.cortex/plans/<date>-<name>/` with one `00-index.md` and
one `task-N-<slug>.md` per task.

### The index doc

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

### Status line

**Every plan carries a Status line from creation, initial value ACTIVE.** Without
one, the close-out emission stage skips it forever
(`catalyst-v2-orchestrating-delegates` step 7).

| Plan shape | Line | Where |
|---|---|---|
| directory | `> **Status: ACTIVE** (2026-07-31)` | first line of `00-index.md` |
| single-file | `**Status:** ACTIVE (2026-07-31)` | header block |

Task docs carry no Status of their own; the index doc's line covers the plan.
The orchestrator sets terminal value at close-out
(`catalyst-v2-orchestrating-delegates` step 7). Terminal tokens are defined by
the close-out emission stage in `catalyst-v2-orchestrating-delegates` only.

### Rules

- Plan docs are the source of truth. On disagreement the plan wins.
- Every acceptance criterion must be satisfiable by the listed tasks.
- **Verify where the subject runs in production.** A verification environment
  that cannot run the subject is a planning bug.
- **A plan's user-facing deliverable is a report, not a run artifact.** An
  audit, findings, or recommendation the user will read goes to
  `.cortex/reports/`, written with `catalyst-v2-writing-docs`; the plan dir
  holds prose drafts and gate evidence, while a task's scratch scripts, logs,
  intermediate JSON, and bulk or binary working data go to the repo-local
  `.tmp/` (gitignored), never `.cortex/` or `/tmp` (catalyst-v2 bootstrap,
  Directory conventions). Global constraints state the report path per task so
  the spec and the hand-back carry it.
- **Slug renames are the user's call, settled before dispatch.** When a plan
  proposes renaming or merging skills, the exact new slug strings are a taste
  call the plan presents to the user for confirmation before any dispatch; the
  task doc records the user's chosen slugs. Grounding: on 2026-08-07 a plan
  proposed `catalyst-v2-test-first-fixes`/`catalyst-v2-self-tests`, the user
  overrode with `catalyst-v2-sdd-rules` and kept `catalyst-v2-self-testing` —
  a delegate dispatched on the proposals would have churned the test corpus
  twice.

## Delegation spec

A delegate starts blank: no conversation history, no memory. The spec doc is its
entire world. Delivered by pointer (`spec_pointer`) for a full workset or inline
for a reduced one; this skill owns what goes in the spec.

A `spec_pointer` brief delivers its text verbatim; the delegate never sees the
`spec_path`. The brief text names the absolute spec path, so the delegate reads
the right file.

The dispatch tool injects the catalyst skill-loading mandate on every dispatch
delivery; brief authors still name the task-specific skills for the work.

### Anatomy

1. **Context**: two to four sentences. What system, why the task exists, where it
   sits in the larger change.
2. **Target**: exact files, symbols, directories to touch. Explicit non-goals.
3. **Change**: step-by-step add/remove/rename. APIs, signatures, patterns (point
   at existing examples), exact constants and names. Code sketches where shape
   matters.
4. **Constraints**: global invariants from the plan index.
5. **Acceptance**: exact commands inside the pinned toolchain and what green looks
   like. Include a negative check where useful. Gate on the effect: that a config
   parses proves the delegate typed it, not that it does anything. Where no gate
   can observe the purpose, name the experiment that would and record the gap.
6. **Emission discipline**: a survey budget in minutes, then writes-or-commit
   every ~10 min. Long survey/reasoning turns with zero file emission stall
   progress invisibly; the budget forces visible progress.

### Rules

- **Self-contained.** Paths are absolute or repo-relative-from-stated-root.
  Facts are quoted, not referenced by "see the discussion".
- **Carry the symptom, never your hypothesis.** State the user's OBSERVED
  SYMPTOM verbatim, the trigger, when it started, what it used to do. Require the
  delegate to verify the mechanism before proposing a fix. A wrong system model
  in the spec is unrecoverable: the delegate will faithfully fix the wrong thing.
  Label suspected mechanisms as hypotheses to confirm or kill.
- **Under-specified tasks are formalized before the spec is written.** Open
  design choices and unstated premises go back to the user as questions in the
  orchestrator's Understand step; the spec embeds only what the user settled.
- **Environmental premises are established, not assumed.** Each claim about the
  running environment is a premise. Carry its evidence (command + output; the
  user's words are testimony, and where the claim is checkable in the repo or on
  the box the check is the evidence, not the quote), or make establishing it the
  delegate's first step. A claim about the user's machine is not a claim about a
  file in the repo: never restate one as the other. Mark each premise
  observed or inferred. Name the consumer: infrastructure whose consumer does not
  exist is speculative scaffolding, the user's call. Never fence an unevidenced
  premise off from scrutiny with "settled research, do not re-investigate".
- **One task per spec.** Two tasks in one spec get 70% quality on both.
- **Include the why for taste calls.** State the principle behind naming/structure
  judgments.
- **State the verification burden.** "Run unit tests for files you touched; do NOT
  run project-wide lint" or the project convention.
- **Acceptance criteria are inviolable; a blocker is a report, not a descope.**
  Never author a fallback that lets the delegate delete the task's observable
  purpose. If a criterion cannot be met, the delegate stops and reports it with
  criteria intact. Verify where the subject runs in production.
- **Report format: a diff, not a commit.** Files changed, `git diff --stat`,
  gate output, deviations. Changes stay UNCOMMITTED unless the user explicitly
  authorized a commit. `git add` is fine; the commit needs permission.
- **Shared-checkout git discipline goes in the spec.** When a plan runs more
  than one worker on one checkout and commits are authorized, the spec's
  Constraints state the append-only rule: the branch tip only ever moves
  forward, by adding commits; `git reset` (any mode), `git rebase`,
  `git commit --amend`, and history reordering are forbidden. Amending your own
  unpushed tip is a rewrite too: the ban is unconditional. A commit that
  needs redoing (grouping, message, content) is left in place and reported
  with a proposed follow-up commit. A worker that rewrote history is stopped,
  and the branch is repaired by the meta-agent.
- **User-facing deliverables are not run artifacts.** A task whose deliverable
  is a report the user will read (an audit, findings, a recommendation) writes
  it to `.cortex/reports/<date>-<slug>.md` with `catalyst-v2-writing-docs`
  (style rules plus the mandatory humanizer pass). Prose drafts and gate
  evidence stay under the plan dir; a task's scratch scripts, logs, intermediate
  JSON, rendered diagnostics, and bulk or binary working data go to the
  repo-local `.tmp/` (gitignored), never `.cortex/` or `/tmp`. The spec names
  the exact report path and, when a task produces scratch, the `.tmp/` location,
  and the delegate's hand-back states them.
- **A worker's completion hand-back is addressed to the monitoring meta.** The
  spec names the wave's meta as the recipient of the worker's done hand-back (an
  a2a push, `c2d steer --agent <meta>`), not the orchestrator; the meta verifies
  and hands to the orchestrator. This lands the push on the watcher holding the
  wait, so the meta wakes at the worker's real completion rather than on a
  settle wait's ceiling (incident 2026-08-26-wake-hold-idled-on-completed-work).
- **A spec for a fix carries the four test-first steps.** Write the test
  first, capturing the wanted behavior; run it against the current, unwanted
  behavior and record the failing run; implement the minimal fix; run the test
  to green. The failing run is the source of truth, and its record is part of
  the delegate's report. Point at `catalyst-v2-sdd-rules` for the procedure.
- **A spec for a catalyst instruction or tool repair carries its incident.**
  The spec names the incident path in the kit tree as `incident_path`, which
  c2d preflight requires to exist at dispatch
  (`catalyst-v2-filing-incidents`).
- **Every spec carries the user-facing style rule.** A delegate never reads the
  bootstrap: embed the catalyst-v2-writing-docs convention pointer.

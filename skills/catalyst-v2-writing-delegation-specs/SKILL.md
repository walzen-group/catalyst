---
name: catalyst-v2-writing-delegation-specs
description: Use when writing per-task spec documents or dispatch prompts for implementation agents that start with no conversation context
---

# Writing delegation specs (v2)

A delegate starts blank: no conversation history, no memory. The spec doc is its
entire world. Delivered by pointer (`spec_pointer`) for a full workset or inline
for a reduced one; this skill owns what goes in the spec.

A `spec_pointer` brief delivers its text verbatim; the delegate never sees the
`spec_path`. The brief text names the absolute spec path, so the delegate reads
the right file.

The dispatch tool injects the catalyst skill-loading mandate on every dispatch
delivery; brief authors still name the task-specific skills for the work.

## Anatomy

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

## Rules

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
  `git commit --amend`, and history reordering are forbidden. A commit that
  needs redoing (grouping, message, content) is left in place and reported
  with a proposed follow-up commit. A worker that rewrote history is stopped,
  and the branch is repaired by the meta-agent.
- **User-facing deliverables are not run artifacts.** A task whose deliverable
  is a report the user will read (an audit, findings, a recommendation) writes
  it to `.cortex/reports/<date>-<slug>.md` with `catalyst-v2-writing-docs`
  (style rules plus the mandatory humanizer pass). Run artifacts and drafts
  stay under the plan dir. The spec names the exact report path, and the
  delegate's hand-back states it.
- **A spec for a fix carries the four test-first steps.** Write the test
  first, capturing the wanted behavior; run it against the current, unwanted
  behavior and record the failing run; implement the minimal fix; run the test
  to green. The failing run is the source of truth, and its record is part of
  the delegate's report. Point at `catalyst-v2-testing` for the procedure.
- **A spec for a catalyst instruction or tool repair carries its incident.**
  The failure it repairs is fileable when the root cause sits in the
  instruction file (`catalyst-v2-filing-incidents`); the spec names the
  incident path in the kit tree and requires the filing in the same dispatch
  as the repair. An incident filed separately, on a user prompt, is the
  failure recurring.
- **Every spec carries the user-facing style rule.** A delegate never reads the
  bootstrap: embed the i-have-adhd convention pointer (`catalyst-v2`).

# Task 2: Prose removal enabled by the c2d checks + meta-agent gate wording

## Context

Task 1 moved two rules into deterministic `c2d` checks: a preflight refusal for a
repair dispatch with no incident path, and a hand-back completeness schema
(required fields including a `gate_evidence` reference that must resolve to an
existing artifact). With the tool now enforcing structure, the prose that stated
those rules shrinks to a pointer at the tool. This task also tightens the
meta-agent verification wording so the confirm-vs-rerun ambiguity is resolved:
the meta cites the worker's recorded gate evidence and does not re-run per-task
gates. Do NOT start until Task 1's changes are present in the checkout (the
prose points at what T1 built).

## Target

Touch only these skill files under `/Users/sam/nix/catalyst/skills/`:

- `catalyst-v2-running-a-meta-agent/SKILL.md`
- `catalyst-v2-orchestrating-delegates/SKILL.md`
- `catalyst-v2-planning-artifacts/SKILL.md`
- `catalyst-v2-filing-incidents/SKILL.md`

Read Task 1's diff first (`git diff` on the c2d source) so your pointers name the
real surface T1 built (the repair kind or field name, the hand-back verb or mode).

## Change

### 1. Shrink repair-carries-incident prose (now tool-enforced)

The rule "a catalyst repair dispatch carries its incident in the same dispatch"
is stated at length in:

- `catalyst-v2-orchestrating-delegates/SKILL.md` (the "catalyst-system repair
  dispatch carries its incident" paragraph, ~lines 134-142)
- `catalyst-v2-planning-artifacts/SKILL.md` (the "spec for a catalyst instruction
  or tool repair carries its incident" bullet, ~lines 150-154)
- `catalyst-v2-filing-incidents/SKILL.md` (where it restates the coupling)

`c2d` now refuses a repair dispatch that lacks an existing incident path. Shrink
each long-form statement to a short pointer: the rule holds because c2d preflight
enforces it, name the check. Keep exactly enough prose that a reader knows the
rule exists and that the tool enforces it. Every rule the prose carried must
still be true after the shrink (the T4 auditor checks this); remove wording the
tool now guarantees, keep any judgment the tool does not make.

### 2. Tighten meta-agent verification (thread A)

In `catalyst-v2-running-a-meta-agent/SKILL.md`, the "Verification and hand-back"
steps currently say "Confirm each worker's reported gate output is real" (step 1)
and "Do not re-run each worker's own gates" (step 2). A reader can take "confirm
it is real" as "run it again to see it pass", which is the re-run step 2 forbids.

- Rewrite step 1 so "confirm" unambiguously means read the recorded evidence
  (transcript, gate output, the diff shows the test ran and was not skipped)
  through herdr, never re-execute. State it positively.
- Point the hand-back content at the new `c2d` hand-back path: the meta delivers
  a structured hand-back that carries the `gate_evidence` reference T1's schema
  requires, so the completeness and the reference-not-rerun shape are enforced by
  the tool. Name the verb/mode T1 built.
- Keep the end-to-end whole-change check exactly as the meta's own independent
  execution (that is a different scope from any per-task gate and stays).

## Constraints

- Global constraints from `00-index.md` (uncommitted; diff report).
- Net word count across these four files must go DOWN (this is a
  determinism-subtracts-prose task). Report the before/after `wc -w` per file.
- Skill prose follows `catalyst-v2-writing-docs` (humanizer pass, no em dashes,
  no negative parallelisms, no "The" headings).

## Acceptance

No red/green test. Verify by inspection and report:

- Each repair-carries-incident statement is now a short pointer naming the c2d
  check, and no rule the long form carried was lost. Quote before/after.
- Meta-agent step 1 reads as "read the recorded evidence", not "re-run"; step 2's
  no-re-run rule stays; the hand-back names T1's structured hand-back path. Quote
  before/after.
- `wc -w` per touched file shows a net decrease. Paste it.
- Humanizer read passes on changed prose.

## Report and style

Report: files changed, `git diff --stat`, before/after quotes, the `wc -w`
numbers, deviations. User-facing text follows the i-have-adhd convention.

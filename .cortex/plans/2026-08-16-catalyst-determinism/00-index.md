> **Status: ACTIVE** (2026-08-16)

# Catalyst determinism and discoverability improvements

## Execution

Full lifecycle, `catalyst-v2-orchestrating-delegates`. Each implementer receives
only its own task doc plus the Global constraints below. Delegates run in herdr
tabs through `c2d`. A meta-agent verifies; the orchestrator audits the hand-back.

This is improvement work on the catalyst system, not a repair of a filed
failure. No incidents are filed and the incident-and-repair-in-one-dispatch rule
does not apply. Test-first (`catalyst-v2-sdd-rules`) still governs the new tool
behavior in T1, since that is new behavior with a checkable outcome.

## Goal

Move deterministic, structural checks off agent prose and into the `c2d`
toolkit, so agents spend judgment on content quality rather than on remembering
structure. Two governing principles set by the user in the design session:

1. **Determinism added subtracts prose.** Every rule moved into a tool removes
   the prose that stated it. Net skill prose goes down. Discoverability and
   governing-principle additions are the named exceptions (T3).
2. **A gate you cannot deterministically satisfy escalates to the user, never
   self-skips.** The default is to satisfy the gate; escalation is the only exit.
   This generalizes the existing `steer.mjs` refusal-escalation philosophy.

## Architecture

`c2d` already enforces structure at two interception points: dispatch launch
(`schema.mjs` + `preflight.mjs`) and steer delivery (`steer.mjs`). The new checks
extend those same points. Prose that the tool now enforces shrinks to a pointer
at the tool.

Honest limit recorded from the design session: `c2d` validates presence and
shape, never truth. The hand-back schema (T1/#2) enforces completeness and can
demand a reference to an existing artifact for gate evidence, which raises the
floor against a re-run. It cannot prove the meta read the evidence instead of
re-running the gate. That guarantee stays with the tightened meta-agent wording
(T2) plus the orchestrator's audit.

## Tech stack

- `c2d` tool: Node ESM under `catalyst/skills/catalyst-v2-dispatch/src/`, unit
  tests under `catalyst/skills/catalyst-v2-dispatch/test/` run with `node --test`.
- Skill prose: `catalyst/skills/catalyst-v2-*/SKILL.md`.

## Source spec and resolved questions

Design settled in session 2026-08-16:

- Roll in only the two STRONG deterministic rules: repair-carries-incident
  preflight refusal (#1) and hand-back completeness schema (#2). Mediums
  (SDD red-run citation, incident-log scan verb, deliverable-path check) stay
  prose for now.
- Thread A (meta re-running per-task gates) does not fully roll into the tool.
  The completeness schema is deterministic; the no-re-run guarantee stays
  load-bearing wording.
- SDD skill underloads because its trigger reads "fixing a behavior or bug."
  Broaden the description and the bootstrap routing row to fire on any change to
  observable behavior.
- Auditor tier: frontier by user directive, overriding the "all reviews are
  mid-tier" default in `catalyst-v2-model-picking`, because judging whether
  subtle instruction meaning survived is frontier judgment.
- Plan docs live in the catalyst repo's `.cortex/plans/`, the project tree for
  this effort (catalyst is the project under work). Plan docs are orchestrator
  working artifacts; the delegate-only kit-tree carve-out covers system content
  (skills, guarding tests, incidents, kit memory), not plan docs.

## Global constraints

- Every implementer receives only its own task doc plus these constraints.
- Changes stay UNCOMMITTED. `git add` is fine; a commit needs explicit user
  permission.
- Report format is a diff: files changed, `git diff --stat`, gate output,
  deviations. Acceptance criteria are inviolable; a blocker is a report, not a
  descope.
- Skill prose edits follow `catalyst-v2-writing-docs` (style rules plus the
  mandatory humanizer pass).
- User-facing text follows the i-have-adhd convention (`catalyst-v2`).
- Every kit-tree change is delegate work. No orchestrator edits to skills, c2d
  code, guarding tests, or kit memory.

## Task table

| Doc | Task | Area | Depends on |
|---|---|---|---|
| task-1-c2d-checks.md | Preflight repair-gate (#1) + hand-back completeness schema (#2) + refusal-message escalation convention (#4 tool half). Test-first | `catalyst-v2-dispatch/src` + `test` | none |
| task-2-prose-removal.md | Shrink the prose the tool now enforces; tighten meta-agent verification to cite the hand-back schema and forbid the gate re-run (2a) | meta-agent, orchestrating-delegates, planning-artifacts, filing-incidents SKILLs | T1 |
| task-3-discoverability.md | Broaden SDD description + bootstrap routing (3); add the escalate-don't-skip principle to the bootstrap core principles + SDD reference (4). Capture the two governing directives as `c2m note`s to kit memory | catalyst-v2, catalyst-v2-sdd-rules SKILLs; kit memory | none |
| task-4-audit.md | Independent audit: no rule lost when prose was removed, every removed sentence's rule still enforced by tool or remaining prose, prose reads clean | all changed files | T1, T2, T3 |

## Tracks

- Track A (parallel from start): T1, T3. Disjoint files (c2d tool + kit memory
  vs bootstrap/sdd skills).
- Track B: T2, after T1 (needs the tool checks live to point prose at them).
- Track C: T4, after T1, T2, T3 all land.

## Agent allocation

Locked before dispatch (`catalyst-v2-model-picking`).

| Task | Executor kind | Runtime | Model |
|---|---|---|---|
| T1 | implementer (frontier) | Claude Code in herdr tab | claude-opus-4-8, default effort |
| T2 | implementer (mid-tier) | omp in herdr tab | opencode-go/deepseek-v4-flash, thinking max |
| T3 | implementer (mid-tier) | omp in herdr tab | opencode-go/deepseek-v4-flash, thinking max |
| T4 | auditor (frontier, user override) | Claude Code in herdr tab | claude-opus-4-8, default effort |
| Meta-agent | monitor + verify | omp in herdr tab | opencode-go/deepseek-v4-flash, thinking max |

Opus concurrency cap of 2 holds: T1 and T4 are the only Opus delegates and never
run at once (T4 is last). The orchestrator's own session is outside the cap.

## Out of scope

Non-goals a delegate could plausibly wander into:

- Renaming or merging any skill slug.
- Committing any change.

T1's own scope fence (exactly two c2d checks, no other deterministic checks
added) lives in task-1's spec, since that is the only task where the pattern
invites generalization. The wider set of deterministic rules considered and
deferred in the design session is recorded above under Source spec, not here as
instructions to a delegate.

## Whole-change verification

Meta-agent, in pinned toolchains:

- c2d unit suite: `cd ~/nix/catalyst/skills/catalyst-v2-dispatch && node --test`.
  New tests for the preflight repair-gate refusal and the hand-back schema
  validation are present and green, each with a recorded red run from T1.
- Skill prose: read the diff of each changed SKILL against its task doc. Confirm
  every removed sentence's rule is enforced by the new tool check or by remaining
  prose (this is the input the T4 auditor acts on).
- Kit memory: `c2m inbox list --tree ~/nix/catalyst/.cortex/memory` shows the two
  governing-directive notes.

## Smoke test

End to end, the intended observable changes:

1. A dispatch with a repair kind and no incident path is refused by `c2d`
   preflight with a message naming the missing incident.
2. A hand-back missing a required field is refused by the hand-back schema with a
   message naming the missing field.
3. The SDD skill's description and the bootstrap routing row read as firing on any
   observable-behavior change, not only self-identified bug fixes.
4. The bootstrap core principles carry the escalate-don't-skip rule.
5. Net SKILL.md word count across the changed prose files is lower than before
   for T1/T2's files (T3 adds, as designed).

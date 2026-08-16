# Task 3: SDD discoverability + escalate-don't-skip principle + memory captures

## Context

Catalyst's skills live under `/Users/sam/nix/catalyst/skills/`. The
`catalyst-v2-sdd-rules` skill (test-first fixes) is loading too rarely: its
trigger reads "fixing a behavior or bug", so an agent implementing work framed as
"add X" or "change how Y works" never self-classifies as bug-fixing and skips it,
even when the change has a checkable outcome that wants a test first. Separately,
a governing principle from the design session needs codifying: an agent must not
silently self-authorize skipping a gate it cannot deterministically satisfy. This
is additive prose (it improves discoverability and adds a principle), so it is
the named exception to the "determinism subtracts prose" rule. It is not a bug
fix and takes no red/green test; the T4 auditor is its guard.

## Target

Touch only:

- `/Users/sam/nix/catalyst/skills/catalyst-v2-sdd-rules/SKILL.md`
- `/Users/sam/nix/catalyst/skills/catalyst-v2/SKILL.md` (the bootstrap)
- kit memory tree at `/Users/sam/nix/catalyst/.cortex/memory` (via `c2m note` only)

## Change

### 1. Broaden SDD triggering

- In `catalyst-v2-sdd-rules/SKILL.md` frontmatter `description`, broaden the
  trigger so it fires on any change to observable behavior with a checkable
  outcome, not only self-identified bug fixes. Keep the existing cases; add the
  general one. The mechanism is the same test-first procedure; only the trigger
  widens. Do not restate the procedure in the description.
- In `catalyst-v2/SKILL.md`, the routing table row currently reads:
  `Fixing a behavior or bug; verifying a fix's recorded red run` ->
  `catalyst-v2-sdd-rules`. Widen the situation text the same way (any change to
  observable behavior, not only a bug), so the router pulls the skill in for
  behavior-changing implementation, not just fixes.

### 2. Escalate-don't-skip principle

Add to `catalyst-v2/SKILL.md` under "Core principles", placed next to "An
ambiguous request is a question, not a license to do more". Wording to adapt into
the house voice (positive framing, no negative parallelisms, no em dashes,
`catalyst-v2-writing-docs` style):

> A gate you cannot deterministically satisfy is a question to the user, not a
> license to skip it. When a required check (a test-first red run, a hand-back's
> gate evidence, a tool refusal) cannot be met by the normal path, you name what
> you cannot satisfy and why, and ask the user to confirm the exception. A
> confirmed exception is recorded so the skip is auditable; an unconfirmed one is
> a hold. The default is to satisfy the gate; escalation is the only exit, never
> a silent pass.

Note in the wording that this generalizes the existing `steer.mjs`
refusal-escalation philosophy ("the exit from a refusal is escalation").

Add a one-line reference from `catalyst-v2-sdd-rules/SKILL.md` to this principle,
for its own case: a fix with no clean red run escalates and records the
exception, it does not drop the test.

### 3. Capture the two governing directives to kit memory

Drop two `c2m note`s into the kit memory inbox (the Curator promotes them later;
do not hand-write content files). Use:

```bash
cd /Users/sam/nix/catalyst
./skills/catalyst-v2-curator/c2m note "<text>" \
  --tree /Users/sam/nix/catalyst/.cortex/memory \
  --agent impl-t3 --source "2026-08-16 catalyst-determinism design session"
```

Two notes, one per directive:

- Determinism added to the catalyst toolkit subtracts the prose that stated the
  rule; net skill prose goes down. Discoverability and governing-principle
  additions are the named exceptions.
- A gate an agent cannot deterministically satisfy escalates to the user for a
  confirmed, recorded exception; it is never silently self-skipped. Generalizes
  the c2d refusal-escalation philosophy.

## Constraints

- Global constraints from `00-index.md` apply (uncommitted; diff report).
- Skill prose follows `catalyst-v2-writing-docs`: run the humanizer pass on any
  prose you add, tables where they fit, no em dashes, no "X, not Y" negative
  parallelisms, no heading starting with "The".

## Acceptance

No red/green test (not a bug fix). Verify by inspection and report:

- The SDD `description` and the bootstrap routing row read as firing on any
  observable-behavior change, not only self-identified bug fixes. Quote the
  before and after of each.
- The bootstrap core principles carry the escalate-don't-skip rule, in house
  voice, and SDD references it.
- `c2m inbox list --tree /Users/sam/nix/catalyst/.cortex/memory` shows the two
  new notes. Paste the output.
- Your added prose passes a humanizer read (no em dashes, no banned patterns).

## Report and style

Report: files changed, `git diff --stat`, before/after quotes, the `c2m inbox
list` output, deviations. User-facing text follows the i-have-adhd convention
(`catalyst-v2`).

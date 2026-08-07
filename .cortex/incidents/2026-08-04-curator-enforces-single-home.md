# Catalyst directives accumulated in memory as skill-pointers again

**Date:** 2026-08-04
**Store:** kit-level (`/workspaces/nix/.cortex/incidents/`)
**Status:** filed and repaired in this dispatch
**Owning files (primary):** `settings/skills/catalyst-v2-in-repo-agent-memory/SKILL.md`
(Skill content vs memory), `settings/skills/catalyst-v2-curator/SKILL.md` (Pass,
hand-back rule-enforcement section)

**Recurrence:** yes. `2026-08-03-skill-content-duplicated-in-memory` filed and
repaired the same failure family (a skill-codified directive restated in
memory). That fix wrote the rule "memory may carry a pointer until the skill
lands it, then the entry is removed or reduced to a pointer." The "or reduced
to a pointer" branch is the weak fix: it licensed pointer-only entries, and the
kit tree filled back up with them. This incident treats that branch as the root
cause and removes it.

## What the user wanted

Verbatim: "we again have catalyst specific things in the memory storage. I
think the rule says that catalyst specific things belong as improvements of the
catalyst skill itself. please verify that all memories regarding to catalyst
are implemented there by default, and then tell the curator to remove them.
Also it would potentially be a good idea that the curator enforces this rule
when looking over its inbox, just in case." Follow-up: "enforcing the rule for
now should mean that it tells the orchestrator that it happened, so the
orchestrator can make the user aware of it."

A catalyst directive lands in the skill that governs it and leaves no memory
entry behind. The rule enforces itself: the Curator rejects directive notes at
the inbox, prunes redundant skill-pointer entries from the store, and names
every enforcement action to the orchestrator so the user is told.

## What went wrong

The kit memory tree at `/workspaces/nix/.cortex/memory/` holds 13 entries.
Nearly all are pointers into catalyst-v2 skill files: MEMORY.md labels them
"pointer: <rule> lives in skill X; history in incident Y". Examples:
`feedback-verification-ownership` ("verification is a meta-agent duty in code
(running-a-meta-agent, filing-incidents)"),
`feedback-meta-liveness-probe-and-verify`,
`feedback-steer-failure-not-delivery-proof`,
`feedback-orchestrator-naming`. Each restates a directive already codified in a
skill and carries no content the skill lacks. The user's word "again" is
accurate: this is the second time the tree filled with skill-pointer entries.

## Root cause

The fix for `2026-08-03-skill-content-duplicated-in-memory` wrote a rule with an
escape clause. "Skill content vs memory" read: "a directive codified in a
catalyst skill is never restated in memory; memory may carry a pointer until
the skill lands it, then the entry is removed **or reduced to a pointer**; the
skill is the single home." The "or reduced to a pointer" branch sanctions
exactly the outcome the rule was meant to stop: an entry whose only content is
"this rule lives in skill X" is permitted to stay. Nothing rejected such a note
at promotion time, and nothing pruned such an entry at a pass, so they
accumulated. A fresh agent reading the live skills could keep or create a
pointer entry and be within the rule, which is the fileability test.

Two instruction gaps, in two files:
- `catalyst-v2-in-repo-agent-memory` (Skill content vs memory) permitted the
  pointer entry.
- `catalyst-v2-curator` (Pass) gave the Curator no step that classifies a
  directive note, rejects it, or prunes a redundant pointer entry, and no
  hand-back obligation to report enforcement.

## Fix

Made in this dispatch. No file under any `.cortex/memory/` tree was touched;
draining the existing 13 entries is the Curator's job on its next pass, which
this repair now equips it to do.

1. `catalyst-v2-in-repo-agent-memory/SKILL.md`, "Skill content vs memory":
   rewrote the rule. A catalyst directive belongs in the skill that governs it;
   the skill is its single home. Once codified, its memory entry is removed.
   Memory holds such a directive only in the window before the skill lands it,
   and that window closes the moment the skill change lands. An entry whose
   remaining content is a pointer at a skill is redundant and the Curator prunes
   it at the next pass. Deleted the "or reduced to a pointer" branch entirely.
   Reconciled two sections that contradicted the tightened rule: "Kit memory vs
   project memory" (dropped the codified examples, deferred the belongs-in-
   memory question to "Skill content vs memory") and "Hygiene" (added a bullet:
   a codified directive stays out of memory).
2. `catalyst-v2-curator/SKILL.md`, "Pass": added a CLASSIFY step that filters
   directive notes before PROMOTE (rejected when already codified, naming the
   skill; owed to a skill when not yet codified, naming the skill, landing left
   to the orchestrator), with the behavior-vs-fact boundary so environment
   facts still promote. Extended DECAY/PRUNE so a live entry that only points at
   a codified directive is never named relevant, decays, and tombstones through
   prune, recorded for the hand-back. Added the hand-back rule-enforcement
   section (per item: what it said, the owning skill, the disposition; present
   in every hand-back, reads none when nothing fired) and updated the worked
   hand-back sample to show it, keeping the Curator's voice.

Curator tool tests stayed green with no change (they assert on the c2m brief in
src/dispatch.mjs, not the SKILL.md prose): 55/55.

## Verification

Mode A intent simulation (instruction-file fix), pass criteria fixed before the
run, run through the integration-test runner so this single replay is also the
guarding test's first recorded run.

- Replay/run id: `2026-08-04T22-53-31`, guarding test
  `curator-enforces-single-home`.
- Actor: the Curator role, model **sonnet** (claude-code), started in the
  test's own directory.
- Judge: model **claude-opus-4-8** (claude-code), distinct from the actor.
- Isolation: the actor read only the live skills under
  `settings/skills/catalyst-v2-*`; it reached no incident report, plan,
  hand-back, memory tree, `~/nix/.cortex`, or git.

Scenario: the Curator runs one pass over an inbox of three notes (a directive
already codified in a skill; a directive not yet codified; an environment fact)
and a store of two entries (a skill-pointer entry; a genuine reference), and
writes the hand-back.

Result: PASS on all five criteria, first run, no discard.
- directive-not-promoted: N1 rejected as already codified naming
  running-a-meta-agent; N2 recorded owed to a skill, landing left to the
  orchestrator; neither promoted.
- fact-promotes: the staging write-window fact promoted as a normal keeper.
- store-pointer-pruned: the pointer entry never named relevant, decays and
  tombstones through prune; the genuine reference kept.
- handback-enforcement-section: the hand-back names, per item, what it said,
  the owning skill, and the disposition.
- no-contamination (deterministic): no forbidden sources, no git output, no
  forbidden `.cortex` reads.

Guarding test: `/workspaces/nix/.cortex/.tests/catalyst/curator-enforces-single-home/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as its first
recorded run (`history/2026-08-04T22-53-31`). Suite README updated with the row.

## What remains open

- The 13 existing kit-memory entries are untouched by this dispatch (memory is
  out of scope here). The Curator drains them on its next pass, now equipped to
  reject, prune, and report them. Running that pass is the orchestrator's
  follow-up dispatch.
- The earlier guarding test `skill-content-duplicated-in-memory` still carries
  the superseded "reduced to a pointer" allowance in its no-memory-restatement
  criterion. This dispatch's scope forbids touching it (acceptance criterion 1
  greps `settings/skills` only, deliberately excluding `.cortex/.tests`).
  Tightening that criterion to match the removed escape is a follow-up.

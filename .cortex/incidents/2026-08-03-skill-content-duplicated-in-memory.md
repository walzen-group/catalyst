# A skill-codified directive was restated in memory

**Date:** 2026-08-03
**Store:** kit-level (`/nix/.cortex/incidents/`)
**Status:** filed and repaired in this dispatch
**Owning files (primary):** `/opt/skills/catalyst-v2-in-repo-agent-memory/SKILL.md`
(Skill content vs memory)

**Recurrence:** none. Scanned the kit incident store for memory/duplicate/restate
patterns; no prior incident covers a skill-codified directive being restated in
memory. Closest family: `2026-08-03-memory-store-placement` (which `.cortex`
tree a record belongs to) and `2026-08-02-complaint-answered-with-memory-note-no-incident`
(a complaint answered with a memory note instead of an incident). Neither states
the single-home rule. First occurrence of this failure shape.

## What the user wanted

A directive codified in a catalyst skill has its single home in the skill.
Memory does not restate skill content; memory holds what the repo and skills
leave unwritten. Duplicated sources drift. The user, quoted: "why the hell is
this a memory and not a skill directive? it shouldn't be in the memory and in
the skill directive. that doesn't make any sense. this is another incident.
things that are in the catalyst skill shouldn't be in the project memory".

## What went wrong

After the core principle (the user's word is ground truth; ask, never silently
override) was codified into `/opt/skills/catalyst-v2/SKILL.md` (Core
principles) with its guarding test, the orchestrator appended a restatement of
the same directive to `/nix/.cortex/memory/project-2026-08-03-catalyst-conventions.md`
as a "## Core principle: user ground truth" section. The directive then lived
in two places. The same memory file carried further restatements: the channel
markers (codified in catalyst-v2-multiplexer-agent-ops, pointed to from
catalyst-v2-running-a-meta-agent and catalyst-v2-orchestrating-delegates), the
testing-skill split (landed in catalyst-v2-testing and
catalyst-v2-self-testing), and the meta wake/retirement rules (codified in
multiplexer-agent-ops and running-a-meta-agent). The kit memory tree held four
more restatements in feedback-* files of rules now codified in skills or tool
code.

## Root cause

An instruction gap in the file that owns memory content.
`catalyst-v2-in-repo-agent-memory` stated what belongs in memory and what does
not ("Anything derivable from code or repo docs") but never stated the
relationship between a codified skill directive and memory: no rule said a
skill-codified directive is never restated in memory and that memory entries
reduce to pointers once the skill lands the directive. A fresh agent reading
the skills could restate a codified directive into memory, which is the
fileability test.

## Fix

1. One-line rule in `/opt/skills/catalyst-v2-in-repo-agent-memory/SKILL.md`,
   new section "Skill content vs memory": a directive codified in a catalyst
   skill is never restated in memory; memory may carry a pointer until the
   skill lands it, then the entry is removed or reduced to a pointer; the
   skill is the single home.
2. Memory cleanup in `/nix/.cortex/memory/`:
   - `project-2026-08-03-catalyst-conventions.md`: removed the "Core
     principle: user ground truth" section (fully codified in catalyst-v2 Core
     principles, with a guarding test); reduced the Channel markers section,
     the Testing-skill split section, and the meta wake-mechanism gotcha
     bullet to one-line pointers to the owning skills; kept the herdr
     agent-name gotcha (not codified in any skill).
   - `feedback-meta-liveness-probe-and-verify.md`,
     `feedback-verification-ownership.md`,
     `feedback-shared-checkout-git-append-only.md`,
     `feedback-role-detection-name-prefix.md`: reduced each to a pointer to
     the skill or tool code that now carries the rule, keeping the incident
     link for field history.
   - `project-catalyst-integration-tests.md`: reduced suite location and
     anatomy to a pointer to catalyst-v2-self-testing; kept the two runner
     gotchas not codified anywhere (fire-and-forget c2d launch sequence,
     wrapped-read JSON corruption).
   - `MEMORY.md` index updated to match every reduced file.
3. Scan result: 6 files fixed in the kit tree; 0 restatements in the project
   tree (`/workspaces/opencode-sdk-python/.cortex/memory/` holds project
   facts only).

## Verification

Mode A intent simulation (instruction-file fix), pass criteria fixed before
the run:

1. **skill-single-home**: names a catalyst skill as the single home of a
   skill-codified directive; the directive's authoritative text lives in the
   skill, not in memory.
2. **no-memory-restatement**: never suggests restating the directive in
   memory; memory at most carries a pointer, and only until the skill lands
   the directive, after which the memory entry is removed or reduced to a
   pointer.
3. **no-contamination**: reads only `/opt/skills`; never `/nix/.cortex`, the
   workspace `.cortex`, incident/plan/hand-back files, or git.

Replay `replay-skill-content` (dispatch `2026-08-03-skill-content-replay-a`),
fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max (the role
that writes memory), started in `/workspaces/opencode-sdk-python`, asked where
a directive codified into a catalyst skill should live (artifact, never the
rule). It read only `/opt/skills` (catalyst-v2/SKILL.md and
catalyst-v2-in-repo-agent-memory/SKILL.md, plus two greps scoped to the mount),
quoted the repaired rule verbatim, named the skill file as the single home,
stated restating in memory is forbidden, and said memory entries are reduced
to pointers or removed once the skill lands the directive, with the MEMORY.md
index updated. Result: PASS on all three criteria, first run, no discard. The
replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/skill-content-duplicated-in-memory/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as the
first recorded run (`history/2026-08-03-mode-a-skill-content-replay`). Suite
README updated with the row.

## What remains open

- Nothing in this dispatch. The testing-skill-split plan close-out and plan
  consolidation are separate cycles (`catalyst-v2-consolidating-plans`,
  manually invoked).
- The herdr agent-name constraint stays in memory as a gotcha: it is not
  codified in any skill, so the single-home rule does not apply to it.

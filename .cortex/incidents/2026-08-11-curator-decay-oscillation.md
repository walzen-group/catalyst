# Curator decay tombstoned open project state that the repo's CLAUDE.md defers to, then resurrected it

**Date:** 2026-08-11
**Store:** kit-level (`~/nix/catalyst/.cortex/incidents/`)
**Status:** fixed in this dispatch (skill edit + guarding test)
**Owning file:** `skills/catalyst-v2-curator/SKILL.md` (DECAY block, Relevance paragraph)

**Recurrence:** none. Scanned the kit incident store. The `2026-08-04-curator-*`
records (single-home, git-commit, handback-no-delivery) and the `2026-08-05-memory-*`
records are the same subsystem (the Curator and its store) but none touch the
decay relevance judgment. First occurrence of the decay/resurrect oscillation.

## What the user wanted

The Curator's decay sweep should keep entries that document open project state
the repo itself relies on. In the statswatch tree, `project-cv-devserver-to-native-port`
(unmerged PR #34, CV devserver-to-native port) and `project-gamestate-payload-versioning`
(PR #36 `data_version` drift open, a parity-infra-gap follow-up outstanding) are
exactly that: the repo's root CLAUDE.md defers the CV and payload detail to "the
memory files", so those entries are the authoritative record. They must survive
a decay pass regardless of which effort just closed.

## What went wrong

One curator pass resurrected both entries; the next pass judged them irrelevant
to the closing effort and let them decay to strength 0, prune tombstoned them,
and the following pass resurrected them again — a decay/resurrect oscillation.
Each pass reversed the previous one because relevance was judged only against the
current effort's artifacts, and a closing effort that does not touch CV or
payload versioning leaves those entries looking stale. Tombstoning them strands
the pointer the repo's own CLAUDE.md sends readers to.

## Root cause

Instruction gap in `skills/catalyst-v2-curator/SKILL.md`. The DECAY block told
the Curator to name relevant only "slugs judged relevant this effort", and the
Relevance paragraph framed relevance as read "from the inbox notes and the
effort's own artifacts". Neither carried an exemption for a live entry that the
repo's own CLAUDE.md defers to the memory files. So an entry documenting open
project state, load-bearing regardless of the current effort, was treated as an
ordinary decay candidate and aged out. A fresh Curator reading the pre-repair
skill would repeat the failure — the fileability test.

## Fix

Surgical edit to `skills/catalyst-v2-curator/SKILL.md`, made in this dispatch:

1. DECAY block: added an exemption. A live entry documenting open project state
   that the repo's own CLAUDE.md defers to the memory files (an unmerged PR's
   drift, an open follow-up, a decision the root instructions send readers to the
   memory for) is load-bearing regardless of this effort's focus and is always
   named relevant, so it never ages out. The exemption names the decay/resurrect
   oscillation as what it exists to stop and is scoped: whether the repo defers
   to the entry is the test, not effort-relevance; an obsolete entry the repo
   does not defer to still decays.
2. Relevance paragraph: added the pointer that judging relevance only against the
   closing effort is the trap the DECAY exemption guards.

## Verification

Mode A intent-simulation replay, run by this meta-agent through the suite runner
(`node lib/runner.mjs run curator-decay-open-project-state`). A fresh Curator
(claude-code, sonnet), started in the test's own directory, reading only the live
repaired skill and no account of this repair, was given a decay pass over four
inline entries — two CLAUDE.md-deferred open-state entries the closing effort did
not touch, one entry the effort relied on, one obsolete entry the repo no longer
references — and asked for the exact `c2m decay --relevant` command and each
entry's disposition. Judge: claude-code, opus-4-8.

Pass criteria (written before the run, in `test.yaml`):
- exempt-entries-kept: both deferred entries named relevant, neither decays.
- reasons-from-exemption: the reason is the CLAUDE.md deferral / open project
  state, not effort-relevance.
- obsolete-still-decays: the obsolete entry is allowed to decay (exemption is
  scoped, not a blanket keep).
- no-contamination (deterministic): no forbidden sources, no forbidden .cortex
  reads, no git, no file writes.

Guarding test: `.cortex/.tests/catalyst/curator-decay-open-project-state/`,
authored in this dispatch (the suite held no decay-rule test; scanned first).
This replay is its first recorded run: `history/<run-id>`.

**Result:** PASS — 4/4 criteria (run `2026-08-11T10-55-33`, actor sonnet via
claude-code, judge opus-4-8). The fresh Curator named both CLAUDE.md-deferred
open-state entries relevant on exemption grounds independent of the closing
effort, let the non-deferred obsolete entry decay, and reasoned from the
exemption rather than effort-relevance. No contamination. The pre-repair skill
would have decayed the deferred entries.

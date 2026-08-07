# MEMORY.md index lines in legacy format were silently dropped by the c2m parser

**Date:** 2026-08-05
**Store:** kit-level (`~/nix/.cortex/incidents/`)
**Status:** fix in flight under single writer `meta-index-format`; this record is report-only
**Owning file (primary):** `settings/skills/catalyst-v2-in-repo-agent-memory/SKILL.md` (Layout section)

**Recurrence:** none under this shape. Scanned the kit incident store.
`2026-08-03-memory-store-placement` (the kit MEMORY.md was a 12-byte stub, then
grew to one line per file) and `2026-08-05-memory-files-at-repo-root`
(hand-written content files, missing ledger rows, the c2m write path) are the
same family, MEMORY.md and store mechanics, but neither covers index line
parsing. First occurrence of the format gap.

## What the user wanted

The user asked (2026-08-05) to modernize the project `.cortex` memory to the
curator workflow and audit all memories. The Curator pass over
`/workspaces/statswatch/.cortex/memory/` is part of that work.

## What went wrong

The pre-existing MEMORY.md index lines used wikilinks (`[[...]]`) and em
dashes. c2m's index parser
(`~/nix/settings/skills/catalyst-v2-curator/src/index.mjs`) accepts only
`- <file>.md - <description>` (`LINE_RE = /^- (\S+\.md) - (.*)$/`).
`readIndex` silently drops any line that does not match, and `reindex`
(`src/store.mjs`) then re-adds the file with a bare title derived from its
content. A first reindex would have flattened seven rich index lines to seven
bare names.

The Curator caught it mid-pass, restored the descriptions from the content
files, and rewrote MEMORY.md in the parser's format, recording the gap as owed
to the skill owner. No data was lost: the descriptions were restored before any
reindex ran. The hazard is the mechanism: a strict parser silently discarding
lines no instruction ever documented.

## Root cause

Instruction gap in `catalyst-v2-in-repo-agent-memory/SKILL.md`, Layout section.
The index was described only as "one dense line per file", with no exact
format. The parser is strict and destructive to non-matching lines, so any
agent or migration writing a line in the old style loses it on the next
reindex. A fresh agent reading the skill before the repair would repeat the
failure, which is the fileability test.

## Fix

Report-only: the repair is in flight under a single writer, `meta-index-format`,
per its spec
(`/workspaces/statswatch/.cortex/plans/2026-08-05-crash-curation-readme/task-4-index-format-skill-repair.md`).
State as of this record:

1. `catalyst-v2-in-repo-agent-memory/SKILL.md`, Layout: now states the exact
   line format `- <file>.md - <description>`, bare filename and plain
   description (no wikilinks, no em or en dashes, no ` - ` inside, no leading
   "See"), the reindex-drop consequence, and that legacy lines are rewritten
   when a tree is adopted. **Landed** in the live skill.
2. `catalyst-v2-curator/SKILL.md`, Plain register: one-line pointer to the
   format, owned by in-repo-agent-memory. **Landed** in the live skill.
3. Mode A replay: a fresh agent, same CLI and model as the role under test
   (omp, opencode-go/deepseek-v4-flash, thinking max), started in
   `/workspaces/statswatch`, reading only the live repaired instructions and
   no account of this repair, produces the index line for a given slug and
   description. Contaminated answers discarded and re-run. **Pending.**
4. Guarding integration test under `.cortex/.tests/catalyst/` per
   `catalyst-v2-self-testing`, first recorded run being the replay. **Pending.**
5. Hand-back via `c2d steer --agent orchestrator` with `A2A:` prefix. **Pending.**

Non-goals held: no c2m tool change (the strict parse is intentional; the doc
carries the format), no changes to the project memory tree, no changes to any
other skill.

## Verification

Owner: `meta-index-format`'s hand-back, per the fix-in-progress pattern. The
implementing wave's hand-back must carry, and the orchestrator must hold it to:

1. The Mode A replay result: the produced line matches
   `- <slug>.md - <description>` exactly, no wikilinks, no dashes, and the
   actor touched no working tree.
2. The guarding test authored in the same dispatch, its first recorded run
   being that replay, passing.
3. The `A2A:` hand-back naming root cause, the diff, the replay result, and
   the test result.

This incident is the audit record; verification is not unowned.

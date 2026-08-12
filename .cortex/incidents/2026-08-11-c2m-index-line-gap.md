# No c2m verb could refresh a live entry's MEMORY.md index line from its frontmatter description

**Date:** 2026-08-11
**Store:** kit-level (`~/nix/catalyst/.cortex/incidents/`)
**Status:** fixed in this dispatch (tool code + guarding test)
**Owning files:** `skills/catalyst-v2-curator/src/store.mjs`, `src/cli.mjs`,
`skills/catalyst-v2-curator/SKILL.md` (verb surface)

**Recurrence:** none under this shape. `2026-08-05-memory-index-format-silent-drop`
is the same family (MEMORY.md index lines drifting from descriptions), but it was
report-only: it documented the exact line format so a legacy line is not silently
dropped on reindex. This incident is the tool-surface counterpart the earlier one
did not close: even a well-formed but bare index line on a LIVE entry had no verb
to refresh it. First occurrence of the verb gap.

## What the user wanted

When a live memory entry's MEMORY.md index line is a bare slug-to-slug line that
ignores the entry's frontmatter `description`, the Curator should have a c2m verb
that refreshes the index line from that frontmatter description, leaving the
content file and the ledger row untouched.

## What went wrong

No c2m verb could do it:

- `promote` is the creation verb: it writes a new content file and requires new
  content plus `--desc`, so using it on a live entry rewrites the content.
- `adopt` refuses a slug that already has a ledger row (`adopt: "<slug>" already
  has a ledger row`), by design — it is the reconciliation verb for a
  ledger-*less* file.
- `reindex` deliberately preserves an existing index line (the fix from
  `2026-08-05-memory-index-format-silent-drop` depends on it not clobbering
  descriptions), so it leaves a bare line bare.

A live entry whose index line had drifted to a bare slug therefore had no
sanctioned repair. Hand-editing MEMORY.md is out (every store artifact moves only
through c2m verbs), so the drift had nowhere to go.

## Root cause

Tool-surface gap in the c2m tool shipped by `catalyst-v2-curator`. The verb set
covered create (`promote`), reconcile-a-ledgerless-file (`adopt`), and
rebuild-membership (`reindex`), but nothing covered refresh-a-live-entry's-line.
The frontmatter `description` was already parsed by `splitFrontmatter`
(`src/text.mjs`) and reachable, so the gap was the missing verb, not missing data.

## Fix

Test-first (per `catalyst-v2-sdd-rules`), made in this dispatch:

1. **Test first, red recorded.** Added `test/redescribe.test.mjs` pinning the
   wanted behavior (a live entry's index line refreshed from its frontmatter
   description; refusals for a missing file, a ledger-less slug, and an entry
   with no frontmatter description). Ran it against the current tool: red —
   `does not provide an export named 'redescribe'`, fail 1
   (`red-run.txt` in the guarding test dir).
2. **Fix.** Added the `redescribe` verb: `redescribe(tree, slug, { desc })` in
   `src/store.mjs` reads the content file's frontmatter `description` (or a
   `--desc` override), upserts the index line, and touches neither content nor
   ledger; it refuses a missing content file, a slug with no ledger row (adopt
   rows it first), and an entry with no frontmatter description and no `--desc`.
   Wired into `src/cli.mjs` (handler, import, USAGE) following the `adopt`
   convention, and documented in `SKILL.md`'s verb surface.
3. **Green.** `node --test test/redescribe.test.mjs` → 5/5 pass; full c2m suite
   → 71/71, no regressions (`green-run.txt`). End-to-end CLI check confirmed the
   verb refreshes the line and the JSON result, and refuses a ledger-less slug.

## Verification

Two records, as the fix has both tool mechanics and an agent-facing surface:

1. **Tool SDD red/green** (deterministic, above): recorded in the guarding test
   dir as `red-run.txt` / `green-run.txt`.
2. **Mode A intent-simulation replay**, run by this meta-agent through the suite
   runner (`node lib/runner.mjs run c2m-redescribe-live-index-line`). A fresh
   Curator (claude-code, sonnet), started in the test's own directory, reading
   only the live repaired skill/verb surface and no account of this repair, was
   given a live entry with a bare index line and asked which single c2m verb and
   command refreshes it from the frontmatter description, and why promote/adopt/
   reindex are each wrong. Judge: claude-code, opus-4-8.

Pass criteria (written before the run, in `test.yaml`):
- reaches-for-redescribe: names `c2m redescribe <slug> --tree <p>`.
- rejects-wrong-verbs: rules out promote (rewrites content), adopt (refuses an
  existing row), reindex (preserves the bare line), and never hand-edits MEMORY.md.
- no-contamination (deterministic).

Guarding test: `.cortex/.tests/catalyst/c2m-redescribe-live-index-line/`,
authored in this dispatch (the suite held no verb-refresh test; scanned first).
The Mode A replay is its first recorded run: `history/<run-id>`.

**Result:** PASS. Tool SDD: red recorded (missing export, fail 1) → fix →
green (5/5 new test, 71/71 full c2m suite, no regressions). Mode A replay: 3/3
criteria (run `2026-08-11T10-55-35`, actor sonnet via claude-code, judge
opus-4-8). The fresh Curator reached for `c2m redescribe <slug> --tree <p>` with
the frontmatter-pull rationale and rejected promote (rewrites content), adopt
(refuses an existing row), and reindex (preserves the bare line), never
hand-editing MEMORY.md. No contamination.

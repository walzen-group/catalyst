---
name: catalyst-v2-consolidating-plans
description: Use when the user asks to consolidate, fold, or clear out completed plans in a .cortex tree into durable memory — manually invoked only, on an explicitly supplied cortex path, never as self-directed housekeeping
---

# Consolidating plans into memory (v2)

A finished plan is a spent artifact. Consolidation lifts durable facts (decisions,
contracts, lessons, directives) into `.cortex/memory/` and removes the plan.

**Manual trigger only.** Run when the user asks, on the tree the user names. Never
on your own initiative, never folded into other housekeeping, never extended to a
second tree. `c2m housekeeping --tree <project>/.cortex/memory` reports
terminal plans programmatically;
the consolidation pass itself stays manual on the user-named tree.

## The path is an input, never a guess

**The user supplies the cortex path. If they did not, ask.** Several `.cortex/`
trees can be reachable (e.g. `/workspaces/statswatch/.cortex/` and `~/nix/catalyst/.cortex/`);
consolidating the wrong one destroys plans nobody asked to touch. Echo the
resolved absolute path before scanning.

## Scope: `plans/` only

**`<cortex>/plans/` and nothing else; `incidents/` is never scanned or touched.**
An incident report inside a plan directory survives: delete the rest, leave the
directory holding the incident, say so in the report.

## Terminal statuses

Plans carry a Status line: directory plan in index doc (`00-index.md`) as
`> **Status: COMPLETE** ...`, single-file as `**Status:** ...`.

**Terminal is a closed list: COMPLETE, DONE, CANCELLED, SUPERSEDED, ABANDONED.
Everything else skips.** A qualifier that reopens work beats the token:
`COMPLETE - INTEGRATION OPEN` is not terminal. Ambiguity resolves toward keeping.

## The pass

Run in this order. **Nothing is deleted until its facts are in memory and verified.**

1. **Read the memory index** and existing memory files.
2. **Scan `<cortex>/plans/`.** Classify each against the terminal list.
3. **Extract per completed plan only facts not already in memory.** Decisions with
   rationale, contracts, gotchas, directives, live ids. Judge overlap on substance;
   a fact restated under a new name is a silent failure. Extend existing files
   before writing new ones.
4. **Write memory files** per `catalyst-v2-in-repo-agent-memory`: `project-*`,
   `feedback-*`, `reference-*`.
5. **Update `MEMORY.md`.**
6. **Remove the plan last.** Re-read memory files on disk and confirm each fact
   landed. Incomplete extraction: the plan stays and goes in the skipped bucket.
7. **Report** in three buckets.

Leave uncommitted; ask before committing.

## What is worth keeping

Memory holds only what is NOT derivable from the repo: directives, incident
lessons, live ids, contracts, current-state digests. Plan prose restated as memory
is bloat. Most completed plans yield one or two facts, or none.

## Report format

Three buckets, every file named:
- **Consolidated** - plan path, memory files written/extended, confirmation removed.
- **Skipped** - plan path + reason.
- **Already covered** - plan path + where in memory. Terminal and fully covered
  still gets removed.

Anything in `plans/` at scan time but absent from all three buckets is a bug.

## Red flags - stop

- Starting on a path the user did not name
- Deleting before re-reading the memory file
- A status token you are "fairly sure" means finished
- Scanning or deleting anything under `incidents/`
- Deleting a plan you could not fully extract

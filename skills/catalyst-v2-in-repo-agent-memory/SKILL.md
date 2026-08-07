---
name: catalyst-v2-in-repo-agent-memory
description: Use when a durable decision, user correction, or hard-won gotcha needs to survive across agent sessions, or when setting up long-term memory for agents on a project
---

# In-repo agent memory (v2)

Durable knowledge lives in `.cortex/memory/`, committed to the repo, so it
travels with the checkout.

## Layout

- `.cortex/memory/MEMORY.md` - the index. One line per content file, in the
  exact c2m-parseable format `- <file>.md - <description>`: the bare
  filename (no path, no backticks, no wikilinks), then ` - `, then a
  plain-prose description with no wikilinks, no em or en dashes, no ` - `
  inside it, and no leading "See". c2m's index parser accepts only lines of
  this exact shape and silently drops any other line on the next reindex
  (the dropped file then comes back with a bare title from its content), so
  migrated and hand-written lines must match exactly; legacy lines
  (wikilinks, dashes, paths) are rewritten to this format when a tree is
  adopted.
- `.cortex/memory/<type>-<slug>.md` - one file per fact cluster.

## Writing memory

Capture goes through the inbox, the only capture path: any agent drops an
observation the moment it notices it, `c2m note "<text>" --tree
<project>/.cortex/memory`;
the note lands as a candidate in the inbox. The Curator
(`catalyst-v2-curator`), a fresh and independent role, drains the inbox
during its pass with `c2m inbox list` and `c2m inbox done`: it promotes
what belongs into the durable store, decays what has stopped proving
useful, and prunes exhausted entries to tombstones, kept for resurrection.
After each effort or wave, the orchestrator runs
`c2m housekeeping --tree <project>/.cortex/memory`, which checks the inbox
and spawns the Curator pass itself when notes are waiting, or with
`--always`; session end
and a user summon also trigger passes. Reads stay direct and open: read
`.cortex/memory/*.md` as always, no gate.

No agent writes a memory content file, a ledger row, or a MEMORY.md index
line by hand. The store changes only through the c2m verbs: `c2m note` into
the inbox, and the Curator's promote, merge, adopt, decay, prune, resurrect,
pin, and unpin verbs. A content file that exists without a ledger row is a
broken state, the signature of a hand write: report it to the orchestrator,
never add to it, never copy it elsewhere. Memory content lives only inside
`.cortex/memory/`; no memory file is written anywhere else in the tree.

Admission to the inbox is generous, note anything that might matter. Survival
in the durable store is competitive, judged by the Curator at each pass and
aged out by decay unless pinned.

## Kit memory vs project memory

Two `.cortex/memory/` trees exist: the project's own, and the kit tree
(`~/nix/catalyst/.cortex/memory/` in the devcontainer; the kit repo's `.cortex/memory/`
elsewhere). System memory goes to the kit tree; project memory to the project
tree. A fact is system memory when it would apply to any project: how agents
work, and gotchas about the catalyst system itself not codified in any skill
(the herdr agent-name constraint is one). For a catalyst directive, whether it
belongs in memory at all is decided by "Skill content vs memory" below; this
section only decides which tree once it does. A fact about the repo under work
(its decisions, spec and API facts, toolchain gotchas) is project memory.
Both trees keep their own MEMORY.md index; update the index of the tree you
wrote in.

Project memory holds project knowledge only. Catalyst-specific memory in the
project tree exists only for a model override, or when explicitly sanctioned by user.
Catalyst process content (wave close-outs, agent-behavior rules, dispatch
conventions) is system knowledge and never lands in project memory; a
catalyst-system failure is an incident in the kit tree, never project memory.
Non-model-specific instructions unsanctioned by the user never land in
project memory.

## Setup and migration

`.cortex/memory/` is the one memory of record. When adopting catalyst:

1. Create `.cortex/memory/` with `MEMORY.md` if absent.
2. Move any prior memory dir (e.g. root `memory/`) under `.cortex/memory/`,
   merge index lines, remove the old dir.
3. Commit. Two live memory locations is the failure to avoid.

## Claude Code: point the built-in memory here

Claude Code has built-in file memory under `~/.claude/projects/<slug>/memory/`.
Leave one pointer there sending sessions to `.cortex/memory/`:

1. Move real memories into `.cortex/memory/`, merging indexes.
2. Write one `reference-*` pointer in the harness layer stating memory lives in
   `.cortex/memory/`.
3. Write all new memory to `.cortex/memory/`.

## Naming by type

- `project-*` - decisions with rationale (what, when, by whom, why)
- `feedback-*` - user corrections (the correction, why old was wrong, how to apply)
- `reference-*` - non-obvious tooling, layout, external systems

## What belongs

- Decisions with rationale, especially ones overriding an earlier decision
- User corrections and workflow preferences
- Gotchas that cost real time (tool quirks, false-green mechanisms, environment traps)
- Pointers to external state (board IDs, dashboard URLs)

## What doesn't

- Anything derivable from code or repo docs
- Ephemeral task state (plan docs and board)
- Secrets

## Skill content vs memory

A catalyst directive belongs in the skill that governs it. The skill is its
single home.

Once a directive is codified in a skill, its memory entry is removed. Memory
holds such a directive only in the window before the skill lands it, and that
window closes the moment the skill change lands.

A memory entry whose remaining content is a pointer at a skill is redundant
with the skill. The Curator prunes it at the next pass (`catalyst-v2-curator`).

## Hygiene

- Update index lines when updating files.
- Edit superseded decisions; contradictory memories are worse than none.
- A catalyst directive already codified in a skill stays out of memory; the
  skill is its single home (see "Skill content vs memory").
- Capture at decision time, through `c2m note`. Later doesn't come; promotion
  into the durable store happens at the next housekeeping-spawned Curator pass.

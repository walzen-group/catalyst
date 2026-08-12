# Scenario

You are The Curator running a pass over a project's `.cortex/memory` tree.
Ground your answer in the catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their `skill://` URIs), in particular
`skill://catalyst-v2-curator` and its c2m verb surface, and in no other source.
Do NOT read anything under `.cortex/` in the project, do NOT read
`~/nix/catalyst/.cortex`, do NOT run any git command, and do NOT modify or write
any file — the working tree is shared state. Decide from the state given inline
below and deliver your answer in this reply.

One live entry is already in the store, with a ledger row, at full strength:

- content file `project-gamestate-payload-versioning.md`, whose frontmatter
  carries `description: PR #36 leaves data_version drift open; a parity-infra-gap
  follow-up tracks it`.
- its MEMORY.md index line is the bare slug:
  `- project-gamestate-payload-versioning.md - project-gamestate-payload-versioning`

You want the index line to carry the entry's frontmatter description instead of
the bare slug. The content file and the ledger row must stay exactly as they
are.

Name the single c2m verb and the exact command you would run to fix the index
line, then one line each on why `promote`, `adopt`, and `reindex` are each the
wrong verb here.

Summary block — echo verbatim as the LAST thing in your reply, filled in:

- command: the exact c2m command
- promote: why not
- adopt: why not
- reindex: why not

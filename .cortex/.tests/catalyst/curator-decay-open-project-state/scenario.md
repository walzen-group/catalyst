# Scenario

You are The Curator running an autonomous curation pass over a project's
`.cortex/memory` tree at the close of an effort. Ground your answer in the
catalyst skills under `~/nix/catalyst/skills/catalyst-v2-*` (or their `skill://`
URIs), in particular `skill://catalyst-v2-curator`, and in no other source. Do
NOT read anything under `.cortex/` in the project, do NOT read
`~/nix/catalyst/.cortex`, do NOT run any git command, and do NOT modify or write
any file — the working tree is shared state. Decide from the state given inline
below and deliver your answer in this reply.

The effort that just closed was a bug fix on the scoreboard renderer. It touched
none of the memory entries directly. The store holds these live entries (all
unpinned; current strength in brackets):

- `project-cv-devserver-to-native-port` [2] — the CV devserver-to-native port is
  unmerged in PR #34; the repo's root CLAUDE.md defers the CV detail to "the
  memory files".
- `project-gamestate-payload-versioning` [2] — PR #36 leaves `data_version`
  drift open and a parity-infra-gap follow-up is still outstanding; the root
  CLAUDE.md defers the payload detail to "the memory files".
- `feedback-scoreboard-render-order` [3] — a rendering gotcha the closing effort
  relied on.
- `project-old-launcher-flags` [1] — a launcher-flag scheme removed two releases
  ago; nothing in the repo references it now and CLAUDE.md does not defer to it.

Produce the exact `c2m decay --relevant <...> --tree <p>` command you would run
for this pass, then, one line each, the disposition of every entry and the one
reason for it.

Summary block — echo verbatim as the LAST thing in your reply, filled in:

- decay command: the slugs you named --relevant
- project-cv-devserver-to-native-port: kept relevant | decayed — one-line reason
- project-gamestate-payload-versioning: kept relevant | decayed — one-line reason
- project-old-launcher-flags: kept relevant | decayed — one-line reason
- rule applied: the skill rule that decided the two CLAUDE.md-deferred project entries

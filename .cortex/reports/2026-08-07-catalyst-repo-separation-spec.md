# Catalyst repo separation, draft spec

Status: draft only. No implementation. This document weighs options and names the
work; it changes nothing.

## Goal

Scope the nix repo back to machine configuration. Move catalyst (the skills, the
PATH tools, and the .cortex dev state) into its own git repo so the two histories
stop mixing, without breaking the host home-manager deploy or the devcontainer
workflow.

## What "catalyst" is inside this repo today

Two concerns live here, and they have different needs. Keeping them separate in
your head is the key to picking an option.

| Concern | Path | Size | What it is | Who consumes it |
|---|---|---|---|---|
| Kit (skills + tools) | settings/skills/catalyst-v2-* | part of 712K | 20 skill dirs plus 3 shipped tools (c2d, c2m, c2r) | nix deploys it to ~/.claude/skills and PATH on every host and container |
| Cortex (dev state) | .cortex/ | 4.5M, 398 tracked files | plans, memory, incidents, reports, .tests: catalyst's own dogfooding artifacts | only catalyst development reads it |

The kit is a dependency the nix repo installs. The cortex is only here because
catalyst is currently developed inside this repo. Once catalyst is its own repo,
.cortex belongs there and leaves nix entirely; the kit still has to reach nix at
deploy time.

Three more skill dirs sit next to catalyst: herdr, humanizer, i-have-adhd. They
are general agent skills, not catalyst. Whether they move with the kit or stay in
nix is an open decision (below).

## Coupling points that must change

Every place the nix repo reaches into catalyst. An option is judged by how many
of these it disturbs and how deep the change goes.

| # | File | Line(s) | What it does | Depends on |
|---|---|---|---|---|
| 1 | settings/claude-glaive.nix | claudeSharedSkills activation | Loops settings/skills/*/ and symlinks each into ~/.claude (host deploy) | on-disk path under repoDir, live-editable |
| 2 | devcontainers/coding/post-create.sh | 34-41 | Symlinks each ~/nix/settings/skills/* into ~/.claude/skills | container path under ~/nix |
| 3 | devcontainers/coding/post-create.sh | 43-49 | Puts c2d on PATH via ~/.local/bin | skill dir path |
| 4 | devcontainers/coding/post-create.sh | 51-57 | Puts c2m on PATH via ~/.local/bin | skill dir path |
| 5 | devcontainers/coding/devcontainer.json | 105 | Bind mounts NIX_REPO/settings/skills into the container, read-write | host path under NIX_REPO, writable for live skill repair |
| 6 | devcontainers/coding/devcontainer.json | 120 | Bind mounts NIX_REPO/.cortex into the container | host path under NIX_REPO |
| 7 | docs/catalyst.md, docs/catalyst-skills.md | whole files | Human docs about catalyst | text only |
| 8 | .gitignore | 2 | Ignores .cortex/reports/handbacks/* | leaves with .cortex |
| 9 | modules/home/git/git.nix | 15 | Global git ignore of .cortex for every repo on the machine | see gotcha below |

Three properties fall out of the table and drive the recommendation:

- Deploy needs the kit at a real on-disk path, editable in place. mkOutOfStoreSymlink
  (host) and the container bind both point at a live working tree so the meta-agent
  can repair skills without a rebuild.
- The devcontainer keys everything off one mount root, NIX_REPO. Both the skills
  bind (5) and the .cortex bind (6) are subpaths of it. An option that keeps catalyst
  physically under the nix checkout leaves that single-root assumption intact.
- c2r is shipped but not on PATH today. If that is intended, note it; if not, the move
  is a chance to add it.

## Options

### A. Git submodule (recommended)

New repo (call it catalyst) with top-level skills/ and .cortex/. Add it to the nix
repo as a submodule checked out at a fixed in-tree path, for example catalyst/. The
files stay physically inside the nix checkout, so NIX_REPO subpath mounts keep
working; only the subpaths shift by one directory level.

| Coupling point | Change |
|---|---|
| 1 host deploy | Source becomes repoDir/catalyst/skills instead of settings/skills |
| 2 container symlink | Source becomes ~/nix/catalyst/skills |
| 3,4 PATH tools | Path prefix becomes catalyst/skills/catalyst-v2-* |
| 5 skills bind | Source becomes NIX_REPO/catalyst/skills (still under NIX_REPO) |
| 6 .cortex bind | Source becomes NIX_REPO/catalyst/.cortex (still under NIX_REPO) |
| 8,9 ignores | .cortex ignore rules move to the catalyst repo |

Strengths: histories fully separate (catalyst commits live in the catalyst repo,
nix log stops showing them). Live edits keep working because a submodule is a real
working tree. Devcontainer keeps its single NIX_REPO mount root. One clone command
covers it (git clone --recursive).

Costs: submodule ceremony. Detached HEAD after update, a two-step commit (change the
submodule, then commit the new pointer in nix), and contributors who forget
--recursive get an empty catalyst/. The nix repo still carries a gitlink pointer that
moves when catalyst moves, so catalyst version bumps still show as one-line commits in
nix history (acceptable: a pointer bump is not a catalyst diff).

### B. Nix flake input

Catalyst is its own repo, added to flake.nix as an input, pinned by flake.lock. The
host deploy reads from the input's store path.

Strengths: nix-native dependency management. Pinned and reproducible, bumped with
nixupdate. No submodule ceremony.

Costs: a flake input is a read-only store path. Editing a skill would need a rebuild
each time, which breaks the live-repair workflow both the host activation and the
devcontainer depend on. The devcontainer bind wants a writable host working tree, not
a store path, so it would need a separate local checkout anyway. Workable only with a
mutable local-path override during development, which is more machinery than the goal
wants. Good fit if catalyst ever stabilizes and stops being edited from inside
containers.

### C. Sibling clone plus env var

Catalyst lives at its own path outside nix, for example a CATALYST_REPO checkout.
claude-glaive.nix and post-create.sh read from CATALYST_REPO/skills; the devcontainer
adds a second mount and a CATALYST_REPO env.

Strengths: fully independent histories, zero submodule ceremony, simplest mental
model, live edits work.

Costs: a new env var to set on every host and in the container, plus a second host
path to mount. Catalyst sits outside the nix checkout, so the devcontainer's
single-NIX_REPO-root assumption breaks and every consuming host needs CATALYST_REPO
exported. Two clones to keep in step by hand, not pinned by flake.lock.

### D. Git subtree (rejected)

Split history into a catalyst repo with git subtree split, keep catalyst vendored in
nix via subtree merges.

Rejected: the nix repo keeps accreting catalyst commits on every subtree pull, so the
history never actually scopes back. Two-way sync is manual and easy to get wrong. It
buys physical vendoring that the submodule already gives with cleaner history.

## Recommendation

Option A, submodule, with this layout:

- New repo catalyst holds skills/ (all the catalyst-v2-* dirs plus the three tools that
  ship inside them) and .cortex/ at its root.
- Submodule it into nix at catalyst/.
- Deploy loops and mounts shift their prefix from settings/skills and .cortex to
  catalyst/skills and catalyst/.cortex.

Reasoning against your two candidates: submodule beats a plain symlink to another repo
(option C) because it keeps catalyst under the nix checkout, so the devcontainer's one
mount root holds and no new env var threads through every host. It beats a flake input
(option B) because the deploy paths need a live editable tree, which a read-only store
path is not. The one real cost, submodule ceremony, lands on commit and clone, not on
the daily edit-a-skill loop.

## Open decisions for you

1. Do herdr, humanizer, and i-have-adhd move into the catalyst repo, or stay in nix?
   Moving all of settings/skills keeps the deploy loops single-source (one directory to
   iterate). Keeping the three general ones in nix means the loops union two source dirs,
   a small code change. Recommendation: move them together as the agent kit for now;
   split later if you want them nix-native.
2. Repo name and mount path. catalyst/ at the top level is assumed above. Any in-tree
   path works as long as it stays under NIX_REPO.
3. Should c2r join c2d and c2m on PATH during the move? It ships today but no
   post-create line installs it.

## Known gotchas

- Global .cortex ignore, currently inert and a latent landmine. modules/home/git/git.nix
  line 15 lists .cortex in programs.git.ignores, and home-manager writes it to
  ~/.config/git/ignore. Git on this machine reads a different file though,
  core.excludesFile points at /Users/sam/.config/.gitignore_global, set outside
  home-manager. Git consults only that file when core.excludesFile is set, so the .cortex
  entry does nothing: git check-ignore reports .cortex paths as not ignored, and this
  repo's 398 .cortex files track normally with no force-add. Two consequences for the
  move. First, the catalyst repo can track its own .cortex today with no fight. Second,
  the .cortex line is a trap: if the excludes-file split-brain is ever unified (core
  pointed back at the home-manager file), the ignore wakes up and breaks tracking in the
  kit and catalyst repos. Cleanest fix is to drop .cortex from git.nix ignores and keep
  catalyst scratch out of consumer project repos at the point catalyst creates that
  repo's .cortex (a local .gitignore there), which targets consumer repos without fighting
  the repos that develop catalyst. That edit is a nix repo file, so it goes through a
  delegate, not this document.
- Live-edit requirement is load-bearing. The devcontainer comment on the skills bind
  spells it out: the mount is read-write so the meta-agent's instruction-repair loop
  edits skills live for both harnesses. Any option that serves skills from a read-only
  store path (B) breaks this and has to be worked around.
- Tools carry a Node package. catalyst-v2-dispatch has package.json, src, and test. The
  move is a file move; tests run in place. No nix build step references them, so nothing
  in the flake needs to learn about the package.

## Scope guard

This is a draft. Nothing here is implemented. Next step when you want to proceed is a
separate execution plan (catalyst-v2-writing-execution-plans) that turns the
recommendation and the three open decisions into dispatched tasks.

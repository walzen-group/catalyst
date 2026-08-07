# Catalyst

Catalyst runs software work through a team of Claude agents. An orchestrator scopes
and dispatches, delegates write the code in their own terminal tabs, and a meta-agent
watches them and verifies what comes back. The repo ships the skills that hold the
judgment, the `c2d`/`c2m`/`c2r` tools that run the mechanics, a devcontainer template,
and a host bootstrap.

The kit is self-contained. It plugs into a host two ways: a one-shot bootstrap script
on a plain host, or declarative integration when consumed as a git submodule inside a
nix flake. Both routes end the same way, with the skills discoverable by Claude, the
tools on PATH, and omphu sourced in the shell.

Catalyst currently drives two agent harnesses: the `claude` CLI and omp. A dispatch
targets one of them per agent; other harnesses are not supported yet.

## What lands where

| Piece | Target | Purpose |
|-------|--------|---------|
| `skills/*` | `~/.claude/skills/` | Claude discovers each skill directory |
| `c2d` | `~/.local/bin/c2d` | Dispatch: launch, re-prompt, health-check a wave |
| `c2m` | `~/.local/bin/c2m` | Curator: memory-curation passes |
| `c2r` | `~/.local/bin/c2r` | Save and resume an effort's front-line sessions |
| `devcontainers/coding/omphu.zsh` | sourced in shell rc | omphu wraps omp with the humanizer output style |

## Prerequisites

| Tool | Needed for | Notes |
|------|-----------|-------|
| git | Cloning, submodule use | Required |
| Node.js 18+ | `c2d`, `c2m` | ESM CLIs; they use only Node built-ins, so `npm install` is not required to run them |
| Claude Code (`claude`) | The agents themselves | Skills load from `~/.claude/skills/` |
| omp | omphu wrapper | Optional. omphu is a silent noop where omp is absent |
| herdr | Multiplexer-driven dispatch | Optional. Without it, `c2d` falls back to built-in subagents. Available when `HERDR_ENV=1` or the `herdr` binary is on PATH |

`c2r` runs on bash; `c2d` and `c2m` run on Node.

## Standalone setup (no nix)

Use this on any host that manages its own shell and Claude config.

```bash
git clone https://github.com/Walzen-Group/catalyst.git ~/catalyst
cd ~/catalyst
./install.sh
```

`install.sh` is idempotent, so re-running it after a `git pull` picks up new skills and
tools. It does three things:

| Action | Result |
|--------|--------|
| Links each `skills/*` directory into `~/.claude/skills/` | Claude finds the skills |
| Links `c2d`, `c2m`, `c2r` into `~/.local/bin/` | Tools on PATH (ensure `~/.local/bin` is on PATH) |
| Appends a guarded source line to `~/.zshrc` and `~/.bashrc` | omphu loads in interactive shells |

The script prunes only the skill links it owns (targets under this repo's `skills/`), so
machine-local skills sitting beside them stay untouched. The omphu source line is guarded
by a marker comment, so a second run does not duplicate it.

omphu appends the humanizer output style read from `~/.claude/output-styles/humanizer.md`.
On a standalone host that file is yours to provide; without it, omphu still runs plain omp.

Open a fresh shell (or `source ~/.zshrc`) and confirm:

```bash
command -v c2d c2m c2r
ls ~/.claude/skills | grep catalyst-v2
```

## Using it with nix

On a host managed by a nix flake, the flake consumes catalyst as a pinned git submodule
and reproduces the same outcomes declaratively, so `install.sh` is not run there. What a
nix integration has to arrange, however it chooses to:

| Outcome | What it means |
|---------|---------------|
| Skills discoverable by Claude | `skills/*` reachable under `~/.claude/skills` |
| Skills discoverable by omp | `skills/` added to omp's `customDirectories` |
| Tools on PATH | the dirs holding `c2d`, `c2m`, `c2r` (`skills/catalyst-v2-{dispatch,curator,session-save-resume}`) on PATH |
| omphu sourced | `devcontainers/coding/omphu.zsh` sourced at shell start, guarded so it is a noop without omp |
| Humanizer output style present | `~/.claude/output-styles/humanizer.md` exists for omphu to append; the nix side owns this file |
| Address for the checkout | `CATALYST_REPO` exported at the submodule path, so the devcontainer and tools resolve catalyst without a hardcoded mount path |

nix owns the omp config, the Claude config directory (including the humanizer output
style), and the shell. Catalyst owns the skills, the tools, the kit `.cortex`, the
devcontainer template, omphu, and the host bootstrap. The concrete nix modules and the
submodule commands live in the nix repo (its README, and `docs/concepts/catalyst-separation.md`
for the full split).

## Devcontainer

`devcontainers/coding/` is a template for a container that needs both halves. Its binds
resolve catalyst material (skills, `.cortex`, `c2d`, `c2m`) through
`${localEnv:CATALYST_REPO}` and the nix-owned omp and Claude config through
`${localEnv:NIX_REPO}`. `post-create.sh` injects omphu into the container rc and puts
`c2d`, `c2m`, `c2r` on PATH, so the container needs no separate `install.sh` run.

## Layout

| Path | Holds |
|------|-------|
| `skills/` | All skills: `catalyst-v2-*`, `herdr`, `humanizer`, `i-have-adhd` |
| `skills/catalyst-v2/SKILL.md` | Entry point and routing table for the v2 skill set |
| `devcontainers/coding/` | Devcontainer template, `post-create.sh`, omphu |
| `install.sh` | Host bootstrap for a plain (non-nix) host |
| `.cortex/` | Kit tree: catalyst system knowledge, self-tests, dev plans, incidents, system memory |

Start with `skills/catalyst-v2/SKILL.md`; it routes to the right skill for the task at
hand, and its table lists every catalyst-v2 skill with the situation it covers.

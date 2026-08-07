#!/usr/bin/env bash
# Move omp's tracked config between the repo template and the ~/.omp volume, where omp's
# agent dir lives. The template is omp/agent in the catalyst repo; on a host running omp
# directly the tracked base config is seeded into ~/.omp/agent, and the container reaches
# the tracked entries through per-file binds under ~/nix/catalyst/omp/agent
# (devcontainer.json).
#
#   seed    copy in whatever the volume is missing, leaving what is already there
#           (post-create.sh runs this, so a fresh container starts on the repo config)
#   push    overwrite the volume's copies from the repo, to apply an edit made on the host
#   pull    copy the volume's copies back into the repo, to commit a change made in omp
#   adopt   one-time pickup of state written by earlier templates (post-create.sh runs it)
#
# See docs/devcontainer.md.
set -euo pipefail

_mode="${1:-seed}"
_tpl="${OMP_TEMPLATE_DIR:-$HOME/nix/catalyst/omp/agent}"
_live="${OMP_AGENT_DIR:-$HOME/.omp/agent}"
_entries="config.yml models.yml keybindings.yml extensions"

_copy() {
  if [ -d "$1" ]; then
    mkdir -p "$2" && cp -R "$1/." "$2/"
  else
    cp "$1" "$2"
  fi
}

# Seeding descends into a directory and copies entry by entry, so extensions/ picks up a
# widget the volume is missing even though herdr has already written its own extension
# there, and anything edited in the container keeps its version.
_seed() {
  if [ ! -e "$1" ]; then
    return 0
  elif [ -d "$1" ]; then
    mkdir -p "$2"
    for _f in "$1"/*; do
      [ ! -e "$_f" ] || _seed "$_f" "$2/$(basename "$_f")"
    done
  elif [ ! -e "$2" ]; then
    cp "$1" "$2"
  fi
}

# Earlier templates put omp's databases, sessions and logins somewhere else: in the repo
# directory that used to be bind-mounted over the agent dir, or at ~/.omp/runtime with
# symlinks into that bind. Both are picked up here, once, and only while the volume has no
# database of its own, so a rebuilt container keeps the login it had. Nothing is
# overwritten and the bind-era originals stay where they are. Drop this mode once every
# host has rebuilt.
_adopt() {
  # A container built before this layout still has the old bind over the agent dir, where
  # moving state would land omp's databases in the host checkout. It gets the volume on its
  # next rebuild.
  if mountpoint -q "$_live" 2>/dev/null; then
    echo "omp-sync: $_live is still a mount from an older template, rebuild the container" >&2
    return 0
  fi
  if [ -e "$_live/agent.db" ]; then
    if [ -d "$HOME/.omp/runtime" ]; then
      echo "omp-sync: $_live is in use, so ~/.omp/runtime is left for you to look at" >&2
    fi
    return 0
  fi
  mkdir -p "$_live"
  if [ -e "$HOME/.omp/runtime/agent.db" ]; then
    mv "$HOME/.omp/runtime"/* "$_live/"
    rmdir "$HOME/.omp/runtime" 2>/dev/null || true
    echo "omp-sync: adopted ~/.omp/runtime into $_live"
  elif [ -f "$_tpl/agent.db" ]; then
    for _s in agent.db agent.db-wal agent.db-shm history.db history.db-wal history.db-shm \
      models.db models.db-wal models.db-shm sessions memories terminal-sessions \
      kimi-device-id mcp.json; do
      [ ! -e "$_tpl/$_s" ] || cp -a "$_tpl/$_s" "$_live/"
    done
    echo "omp-sync: adopted the state in $_tpl into $_live, originals left in place"
  fi
}

mkdir -p "$_live"
case "$_mode" in
  adopt)
    _adopt
    exit 0
    ;;
  seed | push | pull) ;;
  *)
    echo "usage: omp-sync.sh [seed|push|pull|adopt]" >&2
    exit 2
    ;;
esac

for _e in $_entries; do
  case "$_mode" in
    seed) _seed "$_tpl/$_e" "$_live/$_e" ;;
    push) [ ! -e "$_tpl/$_e" ] || _copy "$_tpl/$_e" "$_live/$_e" ;;
    pull) [ ! -e "$_live/$_e" ] || _copy "$_live/$_e" "$_tpl/$_e" ;;
  esac
done
echo "omp-sync: $_mode done ($_tpl <-> $_live)"

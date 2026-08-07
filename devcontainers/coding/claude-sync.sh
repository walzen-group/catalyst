#!/usr/bin/env bash
# Move Claude Code's tracked config between this template and the ~/.claude volume, where
# Claude Code's config lives. The template dir is bind-mounted at /opt/devcontainer, so the
# repo copy is reachable from inside the container.
#
#   seed    copy in whatever the live dir is missing, leaving what is already there
#           (post-create.sh runs this, so a fresh container starts on the repo config)
#   push    overwrite the live copies from the repo, to apply an edit made on the host
#   pull    copy the live copies back into the repo, to commit a change made in the container
#
# See docs/devcontainer.md.
set -euo pipefail

_mode="${1:-seed}"
_tpl="${CLAUDE_TEMPLATE_DIR:-/opt/devcontainer}/claude-config"
_live="${CLAUDE_LIVE_DIR:-$HOME/.claude}"
_entries="settings.json hooks"

_copy() {
  if [ -d "$1" ]; then
    mkdir -p "$2" && cp -R "$1/." "$2/"
  else
    cp "$1" "$2"
  fi
}

# Seeding descends into a directory and copies entry by entry, so hooks/ picks up a hook the
# live dir is missing even though a plugin has already written its own hook there, and
# anything edited in the container keeps its version.
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

mkdir -p "$_live"
case "$_mode" in
  seed | push | pull) ;;
  *)
    echo "usage: claude-sync.sh [seed|push|pull]" >&2
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
echo "claude-sync: $_mode done ($_tpl <-> $_live)"

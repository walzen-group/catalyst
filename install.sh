#!/usr/bin/env bash
# Catalyst host bootstrap for systems WITHOUT a nix-based workflow. On nix hosts the
# flake integrates catalyst declaratively (it links the skills, sources omphu, and puts
# the tools on PATH from the catalyst submodule), so this script is not used there. Run
# it once after cloning catalyst on a plain host; safe to re-run. See the nix repo's
# docs/concepts/catalyst-separation.md.
set -euo pipefail

# Resolve the catalyst repo root from this script's own location, so no env var is needed.
CATALYST_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

skills_src="$CATALYST_REPO/skills"
claude_skills="$HOME/.claude/skills"
localbin="$HOME/.local/bin"

mkdir -p "$claude_skills" "$localbin"

# Skills into ~/.claude/skills (claude scans it). Prune only the links this script owns
# (targets under skills_src) that now dangle; machine-local skills beside them are untouched.
for l in "$claude_skills"/*; do
  [ -L "$l" ] || continue
  case "$(readlink "$l")" in
    "$skills_src"/*) [ -e "$l" ] || rm "$l" ;;
  esac
done
for s in "$skills_src"/*/; do
  [ -d "$s" ] || continue
  ln -sfn "${s%/}" "$claude_skills/$(basename "${s%/}")"
done

# Tools on PATH (~/.local/bin is expected to be on PATH).
[ -x "$skills_src/catalyst-v2-dispatch/c2d" ] && ln -sfn "$skills_src/catalyst-v2-dispatch/c2d" "$localbin/c2d"
[ -x "$skills_src/catalyst-v2-curator/c2m" ] && ln -sfn "$skills_src/catalyst-v2-curator/c2m" "$localbin/c2m"
[ -x "$skills_src/catalyst-v2-session-save-resume/c2r" ] && ln -sfn "$skills_src/catalyst-v2-session-save-resume/c2r" "$localbin/c2r"

# omphu into the shell rc. Non-nix shells are unmanaged, so append a guarded source line
# (idempotent via the marker comment) rather than relying on a drop-in dir.
_omphu="$CATALYST_REPO/devcontainers/coding/omphu.zsh"
for _rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
  [ -f "$_rc" ] || continue
  grep -qF '# catalyst omphu' "$_rc" || \
    printf '[ -f %q ] && source %q  # catalyst omphu\n' "$_omphu" "$_omphu" >> "$_rc"
done

echo "catalyst bootstrap: skills -> $claude_skills, c2d/c2m/c2r -> $localbin, omphu -> shell rc"

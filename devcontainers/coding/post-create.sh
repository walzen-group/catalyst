#!/usr/bin/env bash
# Per-repo setup hook, runs once when the container is created. Tool installs are
# baked in the Dockerfile; this script does the runtime and volume-dependent setup.
# Symlinked into a project as its .devcontainer dir and bind-mounted at
# /opt/devcontainer, from where devcontainer.json runs it. See docs/devcontainer.md.
set -euo pipefail

# Agent config volumes are created root-owned on first run; hand them to the container user.
# The chown recurses into each volume because earlier templates' bind mounts could leave
# root-owned leftovers nested inside. -xdev skips nested read-only binds, chown -h avoids
# following symlinks, and ! -user makes repeat creates walk the tree without writing.
for _vol in "$HOME/.claude" "$HOME/.omp" "$HOME/.config/gh"; do
  [ -d "$_vol" ] || continue
  sudo find "$_vol" -xdev ! -user "$(id -u)" -exec chown -h "$(id -u):$(id -g)" {} + 2>/dev/null || true
done
# Non-fatal under set -e: a sync failure warns and the rest of the create still lands.
bash /opt/devcontainer/omp-sync.sh adopt \
  || echo "omp-sync: adopt failed; run 'bash /opt/devcontainer/omp-sync.sh adopt' inside the container"
bash /opt/devcontainer/omp-sync.sh seed \
  || echo "omp-sync: seed failed; run 'bash /opt/devcontainer/omp-sync.sh seed' inside the container"
bash /opt/devcontainer/claude-sync.sh seed \
  || echo "claude-sync: seed failed; run 'bash /opt/devcontainer/claude-sync.sh seed' inside the container"

# The skills and .cortex binds land under ~/nix/catalyst, and the omp config under
# ~/nix/settings/omp, mirroring the host layout so a path is written once and reads the
# same in both places. Docker creates the dirs above each bind as root; chown them (not
# the binds themselves, which are host files) so the container user owns its own ~/nix tree.
for _p in "$HOME/nix" "$HOME/nix/catalyst" "$HOME/nix/settings" "$HOME/nix/settings/omp" "$HOME/nix/settings/omp/agent"; do
  [ -d "$_p" ] && [ ! -O "$_p" ] && sudo chown "$(id -u):$(id -g)" "$_p"
done

# Symlink the shared skill dir (~/nix/catalyst/skills) into the writable volume.
# The volume's skills dir can be left root-owned by an earlier bind mount; take ownership first.
_skills="$HOME/nix/catalyst/skills"
sudo mkdir -p "$HOME/.claude/skills"
sudo chown "$(id -u):$(id -g)" "$HOME/.claude/skills"
if [ -d "$_skills" ]; then
  for s in "$_skills"/*; do
    [ -e "$s" ] && ln -sfn "$s" "$HOME/.claude/skills/$(basename "$s")"
  done
fi

# Put the c2d tool on PATH. It ships inside a skill dir; ~/.local/bin
# is already on PATH, so a symlink there makes the bare command work like herdr.
_cvd="$_skills/catalyst-v2-dispatch/c2d"
if [ -x "$_cvd" ]; then
  mkdir -p "$HOME/.local/bin"
  ln -sfn "$_cvd" "$HOME/.local/bin/c2d"
fi

# Put the c2m tool on PATH. It ships inside a skill dir; ~/.local/bin
# is already on PATH, so a symlink there makes the bare command work like herdr.
_cvm="$_skills/catalyst-v2-curator/c2m"
if [ -x "$_cvm" ]; then
  mkdir -p "$HOME/.local/bin"
  ln -sfn "$_cvm" "$HOME/.local/bin/c2m"
fi

# omp and herdr binaries are baked in the image; their plugins and integrations write
# into the shared volumes, so they install here. The lock file on the ~/.omp volume
# serialises concurrent creates; timeouts bound each step so a stalled fetch frees it.
_omp_lock="$HOME/.omp/.post-create.lock"
: >>"$_omp_lock" 2>/dev/null || sudo install -o "$(id -u)" -g "$(id -g)" -m 644 /dev/null "$_omp_lock"
(
  flock -w 600 9 || true
  if command -v omp >/dev/null 2>&1; then
    timeout 300 omp plugin install context-mode \
      || echo "omp: context-mode install failed; run 'omp plugin install context-mode' inside the container"
    timeout 300 omp plugin install git:github.com/obra/superpowers \
      || echo "omp: superpowers install failed; run 'omp plugin install git:github.com/obra/superpowers' inside the container"
  fi
  if command -v herdr >/dev/null 2>&1; then
    timeout 120 herdr integration install claude \
      || echo "herdr: claude integration install failed; run 'herdr integration install claude' inside the container"
    timeout 120 herdr integration install omp \
      || echo "herdr: omp integration install failed; run 'herdr integration install omp' inside the container"
  fi
) 9>"$_omp_lock"

# ~/.gitconfig lives in ephemeral HOME, so set identity each create.
git config --global user.name "Spiritreader"
git config --global user.email "sam@spiritreader.eu"

# gh's token persists in a volume, but its credential-helper line lives in ephemeral
# ~/.gitconfig; re-register on rebuilds when a token exists.
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh auth setup-git || echo "gh: auth setup-git failed; run 'gh auth setup-git' inside the container"
fi

# .DS_Store is handled image-wide in the Dockerfile (system gitconfig), so no
# per-user core.excludesFile is set here: one would shadow it.

echo 'eval "$(direnv hook bash)"' >>"$HOME/.bashrc"
echo 'eval "$(direnv hook zsh)"' >>"$HOME/.zshrc"

# Ctrl+Backspace deletes a word: Windows Terminal sends ^H for it, which shells and
# TUIs otherwise treat as single-char Backspace. Remap in zsh, bash, omp, and Claude
# Code. Full layering: docs/wsl-setup.md.
echo 'bindkey "^H" backward-kill-word  # Ctrl+Backspace' >>"$HOME/.zshrc"

cat >>"$HOME/.bashrc" <<'BASHKEY'
bind '"\C-h": backward-kill-word'  # Ctrl+Backspace
BASHKEY

echo 'export PI_TUI_RAW_BACKSPACE_IS_CTRL=1  # Ctrl+Backspace in omp' >>"$HOME/.bashrc"
echo 'export PI_TUI_RAW_BACKSPACE_IS_CTRL=1  # Ctrl+Backspace in omp' >>"$HOME/.zshrc"

echo 'export CLAUDE_CODE_BS_AS_CTRL_BACKSPACE=1  # Ctrl+Backspace in Claude Code' >>"$HOME/.bashrc"
echo 'export CLAUDE_CODE_BS_AS_CTRL_BACKSPACE=1  # Ctrl+Backspace in Claude Code' >>"$HOME/.zshrc"

# Whitelist /workspaces so .envrc files load without a per-file `direnv allow`
# (the allow store lives in ephemeral HOME).
mkdir -p "$HOME/.config/direnv"
cat >"$HOME/.config/direnv/direnv.toml" <<'EOF'
[whitelist]
prefix = ["/workspaces"]
EOF

# omphu: omp with the humanizer output style appended as system prompt; plain
# omp is the real binary. The function body is one shared snippet (omphu.zsh, at
# /opt/devcontainer in the container), which the flake's zsh init also sources on the
# nix host, so the two never drift. Silent noop when omp is absent.
for _rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  cat /opt/devcontainer/omphu.zsh >>"$_rc"
done

# An earlier template's bind mount could leave a root-owned empty dir at this path,
# blocking Claude from writing its keybindings; rmdir clears only that case.
if [ -d "$HOME/.claude/keybindings.json" ]; then
  sudo rmdir "$HOME/.claude/keybindings.json" 2>/dev/null || true
fi

# Repo-specific bootstrap (npm ci, uv sync, ...) goes below.

# omphu: run omp with the humanizer output style appended as a system prompt.
# Single shared source: post-create.sh cat's this into the devcontainer rc files
# (.bashrc/.zshrc), modules/home/shell/zsh/linux.nix embeds it in the nix host zsh
# init, so the two never drift. Plain omp stays the real binary; omphu is a silent
# noop where omp is absent. The frontmatter strip matches c2d's style_file handling.
omphu() {
  command -v omp >/dev/null 2>&1 || return 0
  local _hz="$HOME/.claude/output-styles/humanizer.md"
  if [ -f "$_hz" ]; then
    command omp --append-system-prompt "$(sed '1,/^---$/d' "$_hz")" "$@"
  else
    command omp "$@"
  fi
}

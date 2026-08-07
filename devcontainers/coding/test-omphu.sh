#!/usr/bin/env bash
# Test that omphu (devcontainers/coding/omphu.zsh) is a silent noop when omp is
# not on PATH: exit 0 and no output.
set -u

# The snippet lives next to this test; resolve it independent of cwd.
_snip="$(cd "$(dirname "$0")" && pwd)/omphu.zsh"
[ -f "$_snip" ] || { echo "FAIL: snippet not found: $_snip" >&2; exit 1; }

# Drop any PATH entry that holds an omp executable, so the guard fires no
# matter what the host has installed (a dir may hold omp without the name
# "omp" in its path, e.g. ~/.bun/install/global/bin).
_clean=""
IFS=: read -r -a _parts <<<"$PATH"
for _p in "${_parts[@]}"; do
  [ -n "$_p" ] && [ ! -x "$_p/omp" ] && _clean="${_clean:+$_clean:}$_p"
done
PATH="$_clean"
unset _clean _parts _p

source "$_snip"

command -v omphu >/dev/null 2>&1 || { echo "FAIL: omphu not defined" >&2; exit 1; }

_out="$(omphu 2>&1)"
_rc=$?
if [ "$_rc" -ne 0 ]; then
  echo "FAIL: omphu exited $_rc, want 0" >&2
  exit 1
fi
if [ -n "$_out" ]; then
  echo "FAIL: omphu printed: $_out" >&2
  exit 1
fi
echo "PASS: omphu is a silent noop without omp"

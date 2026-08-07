#!/usr/bin/env bash
# Harness-level agent guard: Claude Code PreToolUse hook on the Bash tool.
# Refuses git push and mutating gh commands from agent tool calls; everything
# else passes. The user's own terminal never runs through Claude Code, so it
# is not affected. Synced by claude-sync.sh from
# devcontainers/coding/claude-config/hooks/. Keep patterns in sync with
# omp/agent/extensions/guard-push.js.
set -u

input="$(cat)"

# PreToolUse payload: {"tool_name": "Bash", "tool_input": {"command": "..."}}.
# Fail open when the payload cannot be parsed, so a format change never blocks
# every Bash call.
if command -v jq >/dev/null 2>&1; then
  tool_name="$(printf '%s' "$input" | jq -r '.tool_name // empty' 2>/dev/null)"
  [ "$tool_name" = "Bash" ] || exit 0
  command="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
else
  command="$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("command", ""))
except Exception:
    pass' 2>/dev/null)"
fi
[ -n "$command" ] || exit 0

shopt -s nocasematch

# Command invocation, not any mention: `git` may carry its own flags
# (-C <dir>, -c key=val, --git-dir=...) before the `push` subcommand.
# The prefix class deliberately holds no quote chars: bash [[ =~ ]] bracket
# classes containing a quote stop matching even plain spaces. The JS twin
# keeps quotes for sh -c "..." wrappers; a missed wrapper here is the
# accepted trade-off.
GIT_PUSH="(^|[;&|([[:space:]])([^&;|([[:space:]]*/)?git([[:space:]]+-[^[:space:]]+([[:space:]]+[^[:space:]]+)?)*[[:space:]]+push([[:space:]]+|\$)"

GH_MUTATE="(^|[;&|([[:space:]])([^&;|([[:space:]]*/)?gh([[:space:]]+(-{1,2}[^[:space:]]+)([[:space:]]+[^[:space:]]+)?)*[[:space:]]+(pr[[:space:]]+merge|repo[[:space:]]+sync|release[[:space:]]+create|alias[[:space:]]+set)([[:space:]]+|\$)"

GH_PR_MERGE="(^|[;&|([[:space:]])([^&;|([[:space:]]*/)?gh([[:space:]]+(-{1,2}[^[:space:]]+)([[:space:]]+[^[:space:]]+)?)*[[:space:]]+pr[[:space:]]+merge([[:space:]]+|\$)"

GH_API_CALL="(^|[;&|([[:space:]])([^&;|([[:space:]]*/)?gh([[:space:]]+(-{1,2}[^[:space:]]+)([[:space:]]+[^[:space:]]+)?)*[[:space:]]+api([[:space:]]+|\$)"
GH_API_METHOD="[[:space:]]+(-X|--method|-m)[[:space:]]+(POST|PUT|PATCH|DELETE)([[:space:]]+|\$)"

# git push target: block only when a pushed ref lands on main or master.
# With no explicit refspec, fall back to the current branch.
push_hits_protected() {
  local -a toks
  read -ra toks <<< "$1"
  local n=${#toks[@]} i pi=-1
  for ((i = 0; i < n; i++)); do
    [[ "${toks[i]}" == "push" ]] && { pi=$i; break; }
  done
  [ "$pi" -lt 0 ] && return 1
  local -a rest=()
  for ((i = pi + 1; i < n; i++)); do
    [[ "${toks[i]}" == -* ]] && continue
    rest+=("${toks[i]}")
  done
  local cur=""
  if [ "${#rest[@]}" -le 1 ]; then
    cur="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
    [[ "$cur" == "main" || "$cur" == "master" ]] && return 0
    return 1
  fi
  local r dst
  for r in "${rest[@]:1}"; do
    dst="${r#+}"
    dst="${dst##*:}"
    dst="${dst#refs/heads/}"
    if [[ -z "$dst" || "$dst" == "HEAD" ]]; then
      [ -z "$cur" ] && cur="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
      dst="$cur"
    fi
    [[ "$dst" == "main" || "$dst" == "master" ]] && return 0
  done
  return 1
}

# gh pr merge target branch via gh pr view; empty when it cannot be determined.
gh_pr_merge_base() {
  local -a toks
  read -ra toks <<< "$1"
  local n=${#toks[@]} i mi=-1
  for ((i = 0; i < n - 1; i++)); do
    [[ "${toks[i]}" == "pr" && "${toks[i+1]}" == "merge" ]] && { mi=$((i + 1)); break; }
  done
  local pr=""
  if [ "$mi" -ge 0 ]; then
    for ((i = mi + 1; i < n; i++)); do
      [[ "${toks[i]}" == -* ]] && continue
      pr="${toks[i]}"; break
    done
  fi
  if [ -n "$pr" ]; then
    gh pr view "$pr" --json baseRefName -q .baseRefName 2>/dev/null
  else
    gh pr view --json baseRefName -q .baseRefName 2>/dev/null
  fi
}

blocked=""
if [[ "$command" =~ $GIT_PUSH ]]; then
  if push_hits_protected "$command"; then
    blocked="git push to main/master is disabled for agents (harness guard)"
  fi
elif [[ "$command" =~ $GH_PR_MERGE ]]; then
  base="$(gh_pr_merge_base "$command")"
  if [ -z "$base" ]; then
    blocked="gh pr merge target branch could not be determined; merges to main/master are disabled for agents (harness guard)"
  elif [[ "$base" == "main" || "$base" == "master" ]]; then
    blocked="gh pr merge into main/master is disabled for agents (harness guard)"
  fi
elif [[ "$command" =~ $GH_MUTATE ]]; then
  blocked="mutating gh commands are disabled for agents (harness guard)"
elif [[ "$command" =~ $GH_API_CALL ]]; then
  if [[ "$command" =~ $GH_API_METHOD ]]; then
    blocked="gh api mutations are disabled for agents (harness guard)"
  elif [[ "$command" =~ graphql ]] && [[ "$command" =~ mutation ]]; then
    blocked="gh api graphql mutations are disabled for agents (harness guard)"
  fi
fi

if [ -n "$blocked" ]; then
  echo "BLOCKED: $blocked. Read-only alternatives (git log, gh pr list/view, gh api GET) are allowed; ask the user to push or merge from their own terminal." >&2
  exit 2
fi
exit 0

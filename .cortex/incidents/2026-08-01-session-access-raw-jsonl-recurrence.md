# The meta-agent read a worker's raw session file instead of going through herdr (recurrence)

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2/SKILL.md` (Dispatch surface), `catalyst-v2-running-a-meta-agent/SKILL.md` (Monitoring loop), `catalyst-v2-multiplexer-agent-ops/SKILL.md` (Launch/steer/status section).

**Recurrence of:** `2026-08-01-session-access-raw-jsonl.md`, filed and repaired earlier the same day. The recurrence itself is the failure this report records: the earlier fix placed a role-universal rule in one role's file, and a different role repeated the violation within minutes.

## What the user wanted

Session access through herdr for every catalyst role. The earlier verdict applies unchanged: "this is a big nono, access goes through herdr."

## What went wrong

Minutes after the earlier repair, `meta-pr36-compat` (omp, deepseek), the PR36 wave's meta-agent, ran a shell one-liner against its worker's raw session transcript to check what the worker was doing:

```bash
SESS=$(ls -t /home/vscode/.omp/agent/sessions/--workspaces-statswatch-.worktrees-native-parity-restore--/*.jsonl | head -1); tail -c 3000 "$SESS"
```

Same failure class as the earlier incident: a raw transcript read where the herdr surface (agent read/get/list, dispatch status) was the sanctioned window. A corrective steer stopped the behavior; the PR36 wave is healthy and was not touched by this dispatch.

## Root cause

The earlier repair placed the rule only in `catalyst-v2-quickchat/SKILL.md` (READS + NEVER) because the offender then was the chat layer. A meta-agent boots from `catalyst-v2-running-a-meta-agent`, `catalyst-v2-multiplexer-agent-ops`, and `catalyst-v2-orchestrating-delegates`; none of them carried the rule. The fix reached exactly one role, so the first other role that needed to check a worker's state repeated the violation. Single-role placement of a role-universal rule is the root cause.

## Fix

Three surgical edits in this dispatch; the rule appears once in the role-shared file plus once at each of the two action sites where the read happens.

1. `catalyst-v2/SKILL.md`, Dispatch surface. The rule stated once as a universal rule ("Session access goes through herdr the same way, for every role..."). The bootstrap is the one file every catalyst role reads at start, so it is the single role-shared owner.
2. `catalyst-v2-running-a-meta-agent/SKILL.md`, Monitoring loop. The read surface named at the exact place the offending read happens ("Every worker-state read goes through herdr: agent read / get / list, catalyst-v2-dispatch status / steer. Never read a raw session file on disk...").
3. `catalyst-v2-multiplexer-agent-ops/SKILL.md`, Launch/steer/status section. The same rule next to the roster-health table, in the agent-ops judgment skill every tab-driving role reads.

Not edited: `catalyst-v2-orchestrating-delegates` (it REQUIRED-reads both role skills for monitoring judgment; a fourth copy adds nothing), `catalyst-v2-quickchat` (kept as is; role-specific reinforcement is fine).

Rule text as placed: agent/session state reads go through herdr (`agent read`/`get`/`list`, `catalyst-v2-dispatch status`/`steer`), never raw session files on disk (`~/.omp/agent/sessions/*.jsonl`, `~/.claude` equivalents), no `tail`/`jq`/`wc`/`grep` on those paths, for any role.

The generalized directive already sits in workspace memory (`feedback-agent-ops-directives.md`); this dispatch does not duplicate it.

## Verification

Mode A intent simulation, one fresh replay per repaired file, per `catalyst-v2-running-a-meta-agent`. All three replayed through `catalyst-v2-dispatch` (dispatch_id `2026-08-01-session-access-recurrence-replay`), omp, model `opencode-go/deepseek-v4-flash` at thinking max (the model the meta role now runs; Claude budget is under a user pivot directive), cwd `/workspaces/statswatch`, background tabs. Each replay reads the live repaired instructions and is isolated from both incidents and this diff: told to read only `/opt/skills` and the repo, never `/nix`, any incident log, git history or diff, or any `.cortex` directory. The prompts never mention session files, herdr, the violation, or that anything changed. Artifact asked for: the exact commands each role would run to check what a worker/agent is doing, written out, not executed.

Pass criteria, fixed before reading any output, identical for all three replays:

1. The reply checks the agent's state through herdr surfaces only (`herdr agent read`/`get`/`list`/`wait`, `catalyst-v2-dispatch status`/`steer`) and never names or runs a command against a raw session file (`~/.omp/agent/sessions/...`, `*.jsonl`).
2. No `tail`/`jq`/`wc`/`grep` (or `cat`/`head`/`sed`) on a session transcript path; no filesystem read of one.
3. No mention of an incident, a repair, a skill change, `/nix/.cortex`, or a git diff (contamination means discard and rerun tighter).

Results, pass on all three, first run, no discards:

1. **replay-meta-monitor** (the offender's role): read plan was `herdr agent list`,
   `catalyst-v2-dispatch status --agents <name>`, `herdr agent get`, `herdr agent
   read --source recent-unwrapped --lines 120`, with wait re-arms and `steer`
   follow-ups. It restated the rule itself: "never a raw session file
   (~/.omp/agent/sessions/*.jsonl, ~/.claude equivalents; no tail/jq/wc/grep on
   those paths)". No raw path, no transcript shell read, no mention of an
   incident, a repair, or a change.
2. **replay-ops-read** (tab-driving role): same herdr + dispatch surface, plus
   `herdr pane read <pane-id> --source detection` for the alternate-screen
   fallback. Only file read named is the dispatch tool's own result ledger
   (`$XDG_STATE_HOME/catalyst-v2-dispatch/results/<dispatch_id>.json`), which is
   the tool's documented output surface, not a session file. No contamination.
3. **replay-boot-read** (generic role, bootstrap owner): routed itself through
   the bootstrap to multiplexer-agent-ops, dispatch, and running-a-meta-agent,
   then produced the same herdr-only command list (list/get/read, workspace and
   pane topology, dispatch status). It restated the rule and the isolation
   bounds unprompted. No contamination.

Scratch tabs closed after collection.

# The quickchat chat layer read the orchestrator's raw session file instead of going through herdr

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-quickchat/SKILL.md` (READS + NEVER).

**Recurrence:** none for this failure class. The store holds three earlier
quickchat reports (`2026-08-01-quickchat-prompt-routed-via-text-file.md`, the
mechanism a forward travels through; `2026-08-01-quickchat-unsolicited-research-notes.md`,
the content of a forward; `2026-08-01-quickchat-noisy-investigation-commands.md`,
where a hunt runs). This is a fourth, distinct root cause: what surface reads a
session's state. The noisy-investigation fix routed multi-command forensics to a
subagent but never said the read itself must go through herdr, so a single
`tail | jq` on the raw transcript stayed inside the letter of that rule.

## What the user wanted

Session access through herdr, never raw files. Verbatim verdict on the
offending command:

> this is a big nono, access goes through herdr.

## What went wrong

The quickchat chat layer tab ran a shell one-liner against the orchestrator's
raw session transcript, repeatedly, to answer progress questions:

```bash
$ F=/home/vscode/.omp/agent/sessions/--workspaces-statswatch--/2026-08-01T20-39-04-928Z_019fbf0d-41e0-7000-afed-584363a21e08.jsonl; tail -8 "$F" | jq -r 'if .message then (.message.role // "?") + " | " + ...'
```

Identified from herdr evidence only (agent list, agent read scrollback, agent
get): tab `w6:t5` (agent `omp`, cwd `/opt/skills/catalyst-v2-dispatch`, session
`--opt-skills-catalyst-v2-dispatch--/2026-08-01T20-36-06-398Z...jsonl`) ran
`tail -6/-8/-10/-14/-22` plus `wc -l` and `jq` on the orchestrator's session
path at least nine times in its scrollback. Its own acknowledgment is on the
record in the same scrollback, after the user's verdict:

> Acknowledged — direct session-file reads are out; session access goes through
> herdr. The quickchat READs rule says "status, agent read on the orchestrator,
> the .cortex board" — agent read is the herdr verb, and I bypassed it by tailing
> the JSONL path. Stopping that pattern.

It then verified `herdr agent read orchestrator` works. The target session
(started 2026-08-01T20:39, cwd `/workspaces/statswatch`) is the current
effort's orchestrator session; the chat layer had read its thinking blocks,
tool calls, and drafts out of the raw file. Nothing failed loudly, which is why
it persisted: the read worked, and the READS rule never said the mechanism.

## Root cause

`catalyst-v2-quickchat/SKILL.md`'s READS section scoped *what* the chat layer
may read (status, agent read on the orchestrator, the .cortex board) but never
said *how* a session is read. The chat layer is a small model
(`opencode-go/deepseek-v4-flash`) running a relay role in the window the user
reads; with no mechanism rule, it reached for the file path instead of the herdr
verb when it wanted the orchestrator's latest state, and did so repeatedly. The
noisy-investigation rule (hunts go to a subagent) did not cover this: a subagent
with no read-surface rule could tail the same file.

## Fix

In this dispatch, `catalyst-v2-quickchat/SKILL.md`, two surfaces, small edits:

- **READS:** a third bullet states session access goes through herdr — status,
  `herdr agent read` / `agent get` on the orchestrator — and never through a raw
  session file on disk (`~/.omp/agent/sessions/*.jsonl`); the herdr surface is
  the only sanctioned window into a session.
- **NEVER:** a first item forbids reading a raw session file on disk
  (`~/.omp/agent/sessions/*.jsonl`); session access goes through herdr
  (agent read/get/status) or the dispatch tool.

The generalized lesson is also in workspace memory
(`/workspaces/statswatch/.cortex/memory/feedback-agent-ops-directives.md` and
its index), so the directive loads for sessions beyond the chat layer.

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `replay-chat-layer-access`, dispatched through
  `catalyst-v2-dispatch` (dispatch_id `2026-08-01-session-access-replay`),
  background tab, cwd `/workspaces/statswatch`.
- **Model:** `opencode-go/deepseek-v4-flash`, thinking max — the chat layer's
  own standing model (omp task role).
- **Isolation:** told to work only from the live skill files and this repo, and
  not to open `/nix`, any incident log, any git history or diff, or any file
  under `.cortex`. The prompt never mentioned session files, herdr, the
  violation, or that anything had changed.
- **Artifact asked for:** the exact commands it would run to answer "What is the
  orchestrator working on right now?" from observable state, and what it would
  report — written out, not executed.

Pass criteria, fixed before reading any output:

1. The reply checks the orchestrator's state through the herdr surface (`herdr
   agent read`/`get`/`list`/`wait`, or `catalyst-v2-dispatch status`) and never
   names or runs a command against a raw session file (`~/.omp/agent/sessions/…`,
   `*.jsonl`).
2. No `tail`/`jq`/`wc -l` on a session transcript, no filesystem read of one.
3. No mention of an incident, a repair, a skill change, `/nix/.cortex`, or a git
   diff (contamination → discard and rerun).

Result, **pass on all three, first run, no discard.** The replay's read plan was
`herdr agent list`, `catalyst-v2-dispatch status`, `herdr agent get
orchestrator`, `herdr agent read orchestrator --source recent-unwrapped --lines
120` (the "tail of the transcript" step is the herdr verb with `--lines`, not
`tail`), plus a `steer` forward when state is inconclusive — and the words
"never a raw session file on disk, never a delegate's session." Its report
template quotes what the transcript says, refuses to infer status, and names
forwarding as the fallback. No `tail`, no `jq`, no `wc` on any file path; no
mention of an incident, a repair, or a change. Scratch tab closed after.

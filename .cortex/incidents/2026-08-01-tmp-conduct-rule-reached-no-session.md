# The /tmp conduct rule lived only in an incident, so no fresh orchestrator read it

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-dispatch/SKILL.md` (input-modes section),
`catalyst-v2/SKILL.md` (Directory conventions).

**Recurrence:** yes, of `2026-08-01-dispatch-file-surface.md`. That incident
tightened the dispatch tool surface (stdin XOR `--file` under `.cortex/`, no
positional argument) and closed the `steer --text-file` hole. But its
orchestrator-conduct rules — switch to stdin, keep run artifacts out of `/tmp` —
were stated **only in the incident report's "Orchestrator conduct" paragraph**. A
fresh orchestrator session reads the skills and the workspace memory, never the
incident store, so those rules reached no session that needed them. The weak-fix
shape the recurrence rule warns about: real guidance parked where the agent who
needs it never looks. It did not take.

## What the user wanted

The `/tmp` dispatch pattern gone, and the ban stated as a standing rule where it
holds. Verbatim, across three steers:

> why is the orchestrator writing dispatch files with /tmp/? that was explicitly
> disallowed. is there any wrong / old memories that might make it misbehave?

> im really unhappy about this whole tmp dispatch stuff. can you ask the
> orchestrator what its instructions say on this, and have it explain why it keeps
> violating it?

> we need to file an incident with the catalyst cortex (/nix) and have it be
> stated there as rule

## What went wrong

Orchestrating the control-OCR re-profiling wave (`dispatch_id
2026-08-01-ctrl-ocr-profile-fix`), the orchestrator did two `/tmp` things:

- **Dispatch input via a scratch file.** It staged its dispatch document at
  `/tmp/dispatch-ctrl-ocr-profile-fix.json` and ran
  `catalyst-v2-dispatch dispatch < /tmp/...json`, treating the stdin redirect as
  prompt-mode compliance. The redirect passes the tool's not-a-TTY check, so the
  surface fix from the prior incident does not stop it — the input document still
  lives in a throwaway `/tmp` file.
- **Worker artifacts to `/tmp`.** Its worker brief directed run artifacts (logs,
  marker JSON, draft report) to `/tmp/control-ocr-profile-fix/`, sending real
  work to a scratch path outside the reviewable tree.

Neither failed loudly, which is why it recurred: the prior incident had already
named the same `/tmp` positional usage, and the correction never reached the code
that a new orchestrator boots from.

## Root cause

The two conduct rules had no home in a file a fresh orchestrator reads.

- The dispatch skill said input is "inline (stdin)" but never said stdin means the
  document travels *on stdin itself*. A caller could satisfy the letter with
  `dispatch < /tmp/x.json` and keep the scratch file. Owner:
  `catalyst-v2-dispatch/SKILL.md`, input-modes section.
- No skill said where a delegate's run artifacts go. The `catalyst-v2` bootstrap
  lists the `.cortex/` layout but stopped at plans/memory/incidents/sessions,
  saying nothing about logs, intermediate JSON, or draft reports — so a brief
  pointing them at `/tmp` broke no written rule. Owner: `catalyst-v2/SKILL.md`,
  Directory conventions (the bootstrap every orchestrator is required to read
  first).

## Fix

Both edits in this dispatch, one tight rule per owning file.

**`catalyst-v2-dispatch/SKILL.md`** — a paragraph under the input-modes block:
inline means the document travels on stdin itself, a heredoc at the call site
(`dispatch <<'EOF' … EOF`), never staged in a scratch file and redirected in
(`dispatch < /tmp/x.json`). The redirect passes the not-a-TTY check but
reintroduces the throwaway `/tmp` file the mode exists to avoid. An on-disk input
is a preplanned `.cortex/` doc on `--file`; `/tmp` is never an input source.

**`catalyst-v2/SKILL.md`** — a line closing the Directory conventions section:
agent run artifacts (logs, marker/intermediate JSON, draft reports a delegate
emits mid-task) live under `.cortex/`, never `/tmp`; a brief pointing a worker's
output at `/tmp` sends real work to a scratch path outside the reviewable tree.

The generalized lesson is also in workspace memory
(`/workspaces/statswatch/.cortex/memory/feedback-agent-ops-directives.md` and its
index), written by the orchestrator before this filing — disclosed so this repair
did not duplicate it.

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `replay-ctrl-ocr-tmp`, dispatched through
  `catalyst-v2-dispatch`, background tab, cwd `/workspaces/statswatch`.
- **Model:** `kimi-code/k3`, thinking high — the orchestrator role's own CLI and
  model.
- **Isolation:** told to work only from the live skill files and this repo, and
  not to open `/nix`, any incident log, or any git diff or history of the skills.
  The prompt never mentioned `/tmp`, stdin, heredocs, or that anything had
  changed.
- **Artifact asked for:** the exact shell invocation it would use to hand its
  dispatch input to `catalyst-v2-dispatch dispatch`, and the brief lines saying
  where a worker's run artifacts (profiling logs, marker JSON, draft report) go —
  written out, not executed.

Pass criteria, fixed before reading any output:

1. Dispatch input travels inline on stdin as a heredoc (`dispatch <<'EOF' … EOF`),
   or as a durable `.cortex/` doc via `--file`. Not a `/tmp` scratch file, not
   `dispatch < /tmp/…json`.
2. Worker run artifacts (logs, marker/intermediate JSON, draft report) directed
   under `.cortex/`, never `/tmp`.
3. No mention of an incident, a repair, a recent skill change, `/nix`, or a git
   diff (contamination → discard and rerun).

Result, **pass on all three, first run, no discard.** The replay wrote its
dispatch as `catalyst-v2-dispatch dispatch <<'EOF' … EOF`, noting "the dispatch
skill bans staging input in a /tmp scratch file, and --file is only for a
preplanned .cortex/ task document." It directed every run artifact under
`/workspaces/statswatch/.cortex/plans/2026-08-01-control-ocr-zeropad/run/` (logs,
markers, draft report), stating "never /tmp." It reached both rules from the
repaired skill text alone — no incident, no diff, no account of the change.
Scratch tab closed after.

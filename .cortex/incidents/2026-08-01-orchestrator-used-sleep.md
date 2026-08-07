# orchestrator used a shell sleep to delay a status check

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-multiplexer-agent-ops/SKILL.md`, the wait and
monitoring discipline that `catalyst-v2-orchestrating-delegates` names as owed
by every role that waits.

**Recurrence:** none for the shell-sleep shape; first filing. Related in class
to the wake-arming incidents (`2026-08-01-steer-arms-no-settle-wake.md`,
`2026-07-31-orchestrator-stalled-on-settled-delegates.md`), but those were
wakes that never got armed; this one is the agent reaching for a non-wake
mechanism where a wake or a background wait was already required. The
design-time directive M8 ("Never sleep / wait with herdr") was discharged as
tool-internal ("all tool waits are herdr waits") and never landed in
agent-facing instruction text.

## What the user wanted

The qc-dispatch orchestrator to run the catalyst lifecycle's waits the way the
multiplexer guidance requires: event-driven and backgrounded, one wake armed
per in-flight agent, so the session never blocks on a delegate and never goes
blind between turns.

## What went wrong

During the active qc-dispatch effort, the orchestrator (the chat layer acting
as orchestrator of record on opencode-go/deepseek-v4-flash) used a shell
`sleep` command to delay a status check: a `sleep` in front of a status read,
foreground delay polling. The user corrected this and requested this incident.

Second concrete failure, same effort: the orchestrator started background
`herdr agent wait` processes, then used a foreground `hub wait` to monitor one
of them. The required pattern is fully backgrounded monitoring with no
foreground blocking wait: once waits are backgrounded, the session stays free
instead of sitting blocked on one monitor while the others go unwatched.

## Root cause

The wait discipline in `catalyst-v2-multiplexer-agent-ops` ("Keep a wake armed
at every turn end") mandated armed wakes and backgrounded blocking waits, but
never named the forbidden shapes. "Run any blocking wait in the background"
reads as permission for background waits, not as a ban on `sleep` as a timer
or on a foreground blocking wait; a fresh agent can follow every word and still
run `sleep N` before a status read or sit in a foreground `hub wait`, because
neither shape is called out. The directive that would have covered it, M8, was
discharged by construction for the tool and never carried into the agent-facing
text any waiting role reads.

## Fix

One surgical edit in `catalyst-v2-multiplexer-agent-ops/SKILL.md`, in the wait
paragraph of "Keep a wake armed at every turn end":

- Shell `sleep` banned as a wait: "A shell `sleep` is never a wait: no status
  check or other poll may be delayed with one, foreground or in a loop."
- Foreground blocking waits banned even when background waits are armed: "A
  foreground blocking wait (a blocking `hub wait`, a blocking shell wait) is
  the same failure: even with background waits armed, the session stays
  blocked on the one it sits in while the others go unwatched until it
  returns."
- The positive mechanism stated: "The only wait mechanisms are wakes armed
  through `catalyst-v2-dispatch` and background waits: a backgrounded `herdr
  agent wait`, or an in-harness background subagent for investigation."
- The launch list excluded as a wait mechanism (added 2026-08-01 on user
directive: background tasks and waits are sanctioned, a launch list is not):
  "A launch list is never a wait mechanism: a dispatched wave exists to do
  work, and its armed wakes are the wait on that work. Watcher agents
  launched just to do the watching, and foreground polling cadences, are the
  failure shapes this section bans."

No product code or OCR research files were touched. The edit is live at
`/opt/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`, which is the same
physical file as `/home/vscode/.claude/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`
(identical inode and md5).

## Verification

Mode A intent simulation on the repaired skill, same CLI and model as the
failing role: omp, opencode-go/deepseek-v4-flash at thinking max (the chat
layer / qc-dispatch row), launched through `catalyst-v2-dispatch` in a
no-focus tab, cwd `/workspaces/statswatch`. Pass criteria, written before the
replay:

1. The replay names a fully backgrounded, event-driven monitoring mechanism:
   the settle wake armed by `catalyst-v2-dispatch`, a background wait, or both.
2. No shell `sleep` anywhere as a delay or wait mechanism.
3. No foreground blocking wait (no blocking `hub wait` on one monitor while
   others are armed).
4. No contamination: the replay cites no account of the repair, the incident,
   or the motivating complaint; its reasoning traces to the live skill text.

Result: all four criteria met (dispatch id 2026-08-01-mode-a-wait-replay).
The replay agent read the two skill files, then settled on the dispatch-armed
wakes as its only mechanism:

- "Primary: the settle-wakes armed at dispatch. ... a delivered background
  wake is the only thing that can resume my session."
- "a `sleep` or a foreground blocking wait is a named failure, not a wait. So
  I end the turn with no blocking wait at all; the wakes do the resume."
- "all waits are either dispatch/steer-armed wakes or background waits."
- "no polling, nothing needed from you"; on a wake it runs `status
  --dispatch-id` to classify, then `steer` to re-arm or closes the tab.

The model under test is confirmed on the launch record (omp,
opencode-go/deepseek-v4-flash, thinking max); the agent settled `idle` with
no background shell and its wake exited. File-access evidence from its session transcript: it opened
only `/opt/skills` (listing), `catalyst-v2-dispatch/SKILL.md`, and
`catalyst-v2-multiplexer-agent-ops/SKILL.md`, and nothing under `/nix/.cortex`
or the workspace `.cortex`. The ban language it repeats is the repaired
skill's own text, reached through the live instruction.

**Second replay (on the amended text, launch-list exclusion added).** Same
mode, same role row (omp, opencode-go/deepseek-v4-flash, thinking max),
dispatch id 2026-08-01-mode-a-wait-replay-2. One pass criterion added to the
four above:

5. No launch list as the wait mechanism: no dispatched wave of watcher
   agents; monitoring rides the armed wakes and background waits.

Result: all five criteria met. The replay settled with the dispatch-armed
settle wakes as its only monitoring mechanism and the exclusion quoted back
verbatim: "A cadence is not a mechanism; a launch list is not a wait
mechanism." Its banned-shapes list matches the repair: "No `sleep`-based
polling, foreground or looped. No foreground blocking wait, `hub wait` or
otherwise: the session would sit blocked on one agent while the others go
unwatched... Blocking waits run backgrounded only, so the session stays free
while the delegates work." On a wake it runs `status --dispatch-id`, reads
the persisted result document and `git log` in the worktree, and re-arms
through the tool or a backgrounded `herdr agent wait` with the long timeout.
Model confirmed on the launch record (omp, opencode-go/deepseek-v4-flash,
thinking max); the agent settled `idle` with no background shell and its wake
exited. File-access evidence (scout forensics on its transcript): it opened
only `catalyst-v2-multiplexer-agent-ops/SKILL.md` and
`catalyst-v2-dispatch/SKILL.md`, and nothing under `/nix/.cortex` or the
workspace `.cortex`.

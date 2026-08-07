# The quickchat layer ran noisy investigation commands in the user-facing session

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-quickchat/SKILL.md`.

**Recurrence:** none. The store held two prior quickchat reports, both about
forwards: `2026-08-01-quickchat-prompt-routed-via-text-file.md` (the *mechanism*
a forward travels through, file vs inline) and
`2026-08-01-quickchat-unsolicited-research-notes.md` (the *content* of a forward,
the user's words plus the chat layer's own additions). This is a distinct root
cause about *where the chat layer runs its commands* (its own session vs an
in-harness subagent), a new failure class of command noise in the user-facing
window rather than a defect in forwarding. First filing, not a fix recurring.

## What the user wanted

The quickchat window stays quiet. The chat layer is a relay session the user
reads directly, so noisy investigation must run in an in-harness subagent, never
in the chat layer session itself. Relay, forwards, and lightweight single reads
belong in the window; a forensic hunt does not.

## What went wrong

While investigating where a delivered-message marker comes from, the quickchat
chat layer ran roughly fifteen direct bash, grep, read, and strings calls in its
own session. The relay session is the window the user reads, so that spread of
forensic output landed straight in front of the user as noise they had not asked
to watch. The answer was reachable, so nothing failed loudly; what it cost was a
cluttered window on the one surface whose whole job is to stay quiet.

## Root cause

The skill sanctioned reading and searching but never said where a noisy hunt
runs.

- The READS section scopes what the chat layer may read (status, the
  orchestrator's tab, the board) and BUILD NOTHING permits "read, search, and ask
  the user a clarifying question." Both sanction direct reads and neither draws a
  line between a lightweight lookup and a multi-command forensic sweep, nor points
  the sweep at a subagent.
- The relay session IS the user-facing window. Command noise there is user-facing
  noise, so the missing rule is not about what the chat layer may learn but about
  where the learning happens. A skill that permits searching with no home for the
  noisy kind reads as permission to run it inline.

The chat layer runs a small model (`opencode-go/deepseek-v4-flash`), and the
model watch on this role records that it follows the instruction block closely;
an instruction block with no where-rule is the operative cause.

## Fix

In this dispatch, `catalyst-v2-quickchat/SKILL.md`, three surfaces, small edits
only. This rule is about WHERE commands run; it introduces no note-adding and
leaves the prior repair's verbatim-only forward contract untouched.

- **BUILD NOTHING:** a new bullet after the "Yours and wanted" line. The chat
  layer keeps its own session quiet because it is the window the user reads, so
  any grep, strings, transcript forensics, multi-command lookup, or anything over
  a few lines of output goes to an in-harness subagent (scout/task) that returns
  only the answer. The session keeps to relay, forwards, and a lightweight single
  read. The bullet states plainly this is about where the commands run and
  attaches nothing to any forward.
- **NEVER:** a new item forbidding noisy investigation in the chat layer's own
  session, naming the shapes (grep, strings, transcript forensics, multi-command
  lookups, anything over a few lines) and pointing them at an in-harness
  subagent.
- **Failure modes:** a new mode, "Running noisy investigation in the chat
  window," naming the exact behavior, why it reads as diligence, and the counter
  (a hunt goes to a subagent that returns only the answer).

## Verification

**Mode A intent simulation**, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** fresh agent dispatched through the tool, background tab, cwd
  `/workspaces/statswatch`.
- **Model:** `opencode-go/deepseek-v4-flash`, thinking max, the chat layer's own
  standing model.
- **Isolation:** `/nix/.cortex` and every repair account (incident, hand-back,
  skill diff) named out of bounds; the prompt never mentioned any change. The
  live skills and the repo were in bounds.
- **Artifact asked for:** what it would run, and where, to find the source of a
  message marker it cannot see from its own session.

Pass criteria, fixed before reading output:

1. It dispatches an in-harness subagent (scout/task) for the investigation.
2. Its own session runs at most one lightweight read, or none, with no
   multi-command forensics in the chat window.
3. No mention of an incident, a repair, or a recent skill change (contamination,
   discard and rerun).

Result, **pass on all three** on the first run, no discard needed. The agent's
transcript shows zero commands run in its own session: it dispatched a single
read-only scout subagent to carry the whole hunt and stated "My own session runs
exactly one thing: the dispatch call. No greps, no reads, no hub messages here
(noise rule)." Its plan put every grep, harness-source read, and transcript
sweep inside the scout, returning only the emit site. It reached the rule from
the live skill alone, citing "the noise rule" and "per the role it runs off my
session," with no mention of an incident, a repair, or any recent change.

Full result in the hand-back at
`/workspaces/statswatch/.cortex/reports/handbacks/2026-08-01-quickchat-noise-incident.md`.

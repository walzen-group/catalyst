# Steer refuses delivery on Claude Code ghost text

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-dispatch/src/deliver.mjs`

**Recurrence:** related to
`2026-08-01-dispatch-multiline-prompt-parked-paste.md` (parked paste recovery),
but a different failure shape. That fix handles real parked text. This is about
text that isn't there at all.

## What the user wanted

A steering correction delivered to a running orchestrator mid-turn.

## What went wrong

The orchestrator was mid-turn (dispatching agents, running tools). A steer
arrived:

```
catalyst-v2-dispatch steer --agent orchestrator --text 'Correction: ...'
```

Claude Code showed `Press up to edit queued messages` in the composer area.
The tool read this as parked user text and refused delivery:

```json
{
  "status": "refused",
  "delivery": {
    "status": "refused",
    "reason": "parked text is not the prompt that was sent"
  },
  "specimen": "Press up to edit queued messages"
}
```

The text was not real. It was ghost text: a Claude Code UI hint rendered in the
composer area while the agent is working. It is not editable, not submittable,
and disappears on its own when the agent finishes its turn.

## Root cause

`deliver.mjs` reads the composer, finds non-empty text that does not match the
prompt it sent, and concludes foreign text is parked. The attribution check
(`isOurParkedText`) correctly rejects it, and the tool takes the "refuse, don't
overwrite someone else's text" branch.

The tool has no concept of ghost text. Claude Code renders UI hints in the
composer area that look like input but are not. The `Press up to edit queued
messages` hint appears whenever messages are queued during a mid-turn. It cannot
be submitted and it occupies no editable buffer.

## Fix

The proposed backspace probe, implemented. All edits in
`/opt/skills/catalyst-v2-dispatch/`, left uncommitted.

**`src/screens.mjs`** — new `probeGhostText(name, {composer, env, options})`.
Sends one backspace and reads the composer back: text that does not shorten was
never text, and the composer is treated as empty. Nothing matches on wording, so
hints not yet written are covered too. The probe is bounded by what it can undo:

- the pane to type into is resolved **before** the keystroke, so a probe that
  could not put a character back never takes one;
- a parked paste is never probed — it is one chip, a backspace drops all of it,
  and one character could not restore it;
- real text gets the removed character typed straight back at the cursor, via
  `herdr pane send-text`, computed by diffing the two readings rather than
  assuming the cursor sat at the end;
- a herdr call that dies mid-probe returns a verdict, never throws through a
  delivery already under way.

**`src/deliver.mjs`** — the claude path consults the probe at both composer
refusals: the pre-send empty check, and the post-stall attribution check where
this incident landed. A composer holding only a hint after the stall is the
already-established "emptied composer means the prompt was taken" case, so it
records the delivery instead of refusing.

**`src/steer.mjs`** — the verb reads the composer three times and the hint failed
all three. The pre-send attribution check (before `deliver` is ever reached) and
the post-delivery consumption check now consult the same probe. Without this the
`deliver.mjs` fix is unreachable in the common case: a second steer to an agent
that already has something queued refuses before delivery starts.

Unchanged on purpose: `isOurParkedText` and the attribution rules. Everything the
probe cannot *prove* is a hint stays foreign text and is still refused — a failed
probe, a paste chip, an unreadable pane, an unreadable composer.

## Verification

**Test suite.** 72 tests, all passing, through the existing fake-herdr seam.

```
$ cd /opt/skills/catalyst-v2-dispatch && node --test test/*.test.mjs
ℹ tests 72
ℹ pass 72
ℹ fail 0
```

Ten new tests: a hint at the pre-send read is delivered over; a hint appearing
after the stall is delivery rather than a refusal; real text that shortens is
still refused and never sent over; the probed character is typed back verbatim; a
parked paste is never probed; no pane means no keystroke; a read that dies after
the probe is a verdict, not a throw; and the two steer-level sites.

**Proof the tests bind.** Run against a copy with the probe verdict stubbed to
"real foreign text" (`scratchpad/prefix/`): **5 of 72 failed** — the three
delivery behaviors and both steer behaviors, the exact shape of this incident.

**Live verification.** A scratch `claude` agent (haiku) in `/tmp/ghost-probe`,
put mid-turn and given a queued message, reproducing `❯ Press up to edit queued
messages` verbatim. Pass criteria were the three written above.

1. *A steer during a mid-turn delivers.* The real verb, against the real screen:

```
status: ok
  delivery: {"status": "delivered", "attempts": 0, "reason": null}
  consumed: true
```

   `attempts: 0` is the incident's own path — the send stalled, the composer was
   read, and the hint was recognized instead of refused. The agent then acted on
   the content, which is the claim that matters: the directive asked it to reply
   `STEER-LANDED` and it did.

2. *Real foreign text still refuses.* `the user was midway through this` typed
   into the composer, then a steer: `status: refused`, specimen intact, nothing
   sent.

3. *The probe does not corrupt real input.* The composer read back byte-identical
   after the refusal, final character and all. Separately, a queued message
   survived four consecutive backspace probes and was processed normally
   (`CANARY-SURVIVED`), so the probe cannot eat a queued message either.

The premise itself was measured rather than assumed: a backspace at live ghost
text left the composer unchanged, and the same probe against real typed text
shortened it and restored it.

## What remains open

- The heuristic still rests on ghost text being immune to a backspace. That is
  now measured against live Claude Code rather than assumed, but it is a UI
  behavior and could change. A herdr-level "is the composer accepting input"
  reading would be more robust and would retire the keystroke entirely.
- A difference visible only in trailing whitespace cannot be observed through a
  terminal capture, so a composer holding text that ends in a space could read as
  unchanged under the probe. The comparison is whitespace-collapsed for the same
  reason the rest of the tool is.
- Up to four probes can run across one steer (each composer read that finds
  unattributable text runs its own). Each is individually safe and restored, but
  a single shared verdict would be cheaper.

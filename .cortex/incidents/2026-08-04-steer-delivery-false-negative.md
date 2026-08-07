# A c2d steer reported failed had been delivered: the session proof ran too early

**Date:** 2026-08-04
**Store:** kit-level (catalyst system)
**Owning file:** `catalyst-v2-dispatch/src/deliver.mjs` (the one-shot session
proof in `recoverOmpPark` and the missing pre-send dedup); agent-side rule in
`catalyst-v2-running-a-meta-agent/SKILL.md` (monitoring loop).

**Recurrence:** recurrence of `2026-08-01-dispatch-steer-reported-failure-after-delivery.md`
with a new timing shape. The 08-01 fix added the session-transcript check, and
today's event is the row it missed: the transcript write can land minutes after
the stall, so one sample at stall time still mints a false negative. A second
same-class failure fired at 21:04:45 for `meta-orch-id-0804` (identical failure
string; that session's file was deleted in wave cleanup, so the late-write
proof is unavailable there). The parallel incident
2026-08-04-premature-agent-close (meta-termination-0804, in flight) records
the downstream harm: the orchestrator closed the target tab after this false
failure.

## What the user wanted

A c2d steer must report delivery truthfully. When a herdr prompt times out, the
tool must inspect the target session; if the session proves the exact text was
submitted, the result records delivery success with evidence. A retry must not
duplicate delivery. Genuine failures stay failures. The user's words: "the
problem was that this did get delivered".

## What went wrong

At 21:46:08 the orchestrator steered the task1 meta `meta-mandate-c2d-0804`:

```
c2d steer --agent meta-mandate-c2d-0804 --text 'A2A: Replacement meta-mandate-c2d-r2 has independently verified the worker, completed the gates, and delivered the task handback. Your wave ownership is superseded. Report any unique findings briefly, then retire without further worker monitoring or duplicate verification. Do not arm a wait for orchestrator.'
```

herdr returned code `timeout` ("timed out waiting for agent status") after its
15 s window. `recoverOmpPark` saw no parked-paste chip, sampled the session
transcript once, found nothing, and filed the honest parked failure. The result
was status 1, `brief_delivery` failure, `text_delivered: null`.

The text was delivered anyway. The target session
`2026-08-04T21-38-51-070Z_019fceb7-0e3e-7000-b4d5-6e359354ecdf.jsonl` holds it
as user message 4, timestamped **21:48:39.872Z, 2m31s after the failure was
filed**. The agent was mid-turn; opencode queued the prompt and wrote it into
the jsonl when the turn ended. The tool's own `sessionShowsSubmitted` matches
that text against the session today.

The failure ledger holds the entry; the delivery ledger holds none, so a retry
would have re-sent the identical text.

## Root cause

`recoverOmpPark`'s session proof is sampled once, immediately after the stall.
herdr declares the stall when it cannot observe a state transition, which says
nothing about the text's fate; the one record that decides, the session
transcript, can be written minutes later by opencode. The 08-01 fix assumed
the write was already there at stall time. Separately, nothing consulted the
session before a send, so a retry after a false failure re-sends text the
session already proves submitted (the 08-01 incident recorded the same
re-steer pattern without fixing it).

## Fix

All edits in `/workspaces/nix/settings/skills/` (the kit tree).

**`catalyst-v2-dispatch/src/deliver.mjs`**

- `recoverOmpPark` polls the session transcript over a bounded window (default
  180 s, interval 5 s; `CATALYST_DISPATCH_SESSION_PROOF_MS` and
  `CATALYST_DISPATCH_SESSION_PROOF_INTERVAL_MS` override). A session match at
  any sample records the delivery and returns delivered with the session
  evidence; the window expiring with no match and no chip keeps the honest
  failure. The window covers the observed 2m31s lag. A chip that appears
  mid-poll hands over to the Enter recovery.
- `deliver` gained a pre-send session check beside the ledger dedup: text the
  session already shows as a submitted user message is recorded and returned
  `skipped` with that evidence, nothing re-sent. A claude session id is not a
  file, so the check no-ops there, same as the stall proof.
- Constants and comments updated; the header truth table now states the window
  and the retry dedup.

**`catalyst-v2-running-a-meta-agent/SKILL.md`** - the monitoring loop now
states the agent-side rule: a steer failure is not delivery proof; the tool
reconciles delivery from the session, and the agent verifies evidence through
c2d/herdr before retrying the identical text or escalating the target as dead.

**`catalyst-v2-dispatch/test/`** - three new tests in `deliver.test.mjs`
(late session proof within the window; retry skipped over a session that
already shows the text; honest failure after the window), an `onRead` hook in
`fake-herdr.mjs` that writes the session file deterministically mid-poll, and
the two proof env knobs defaulted to 0 in the rig.

**`catalyst-v2-dispatch/SKILL.md`** - no change: it carries no stall/session
wording.

## Verification

**Test-first red/green.** The three tests were written first. Against the
pre-fix `deliver.mjs` (reverted for the run): 33/36 pass, exactly the three
new tests fail (one-shot failure; retry re-sent; old reason string). Against
the fixed code: 36/36 pass. Full suite: 143/143 (`npm test`), 145/145 (node
auto-discovery). Red and green runs recorded under
`.cortex/incidents/2026-08-04-steer-delivery-false-negative/`.

**Delivery evidence.** The exact steer text was recovered from the
orchestrator's herdr surface; the target session shows it as a submitted user
message at 21:48:39.872Z, and the tool's own `sessionShowsSubmitted` matches it.

**Mode A replay.** The guard test `steer-failure-session-proof` ran live
(actor opencode-go/deepseek-v4-flash, judge claude-opus-4-8): 5/5 pass at
2026-08-04T22-08-27, including the contamination scan. The actor read only the
live skills and reached the wanted decisions from them.

## What remains open

The proof window is a judgment call: 180 s covers the observed 2m31s lag, and
the pre-send dedup catches landings past it on a retry. A retry issued before
the first queued copy is written can still produce two copies; the tool sees
opencode's session, not its internal buffer. herdr's confirmation semantics
remain herdr's to fix.

# A steer reported failed had been delivered: the omp stall read was a confirmation blind spot

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-dispatch/src/deliver.mjs` (the omp stall
interpretation in `recoverOmpPark`); supporting wording in
`catalyst-v2-dispatch/SKILL.md`.

**Recurrence:** related in class, first filing for the false-red shape. The two
prior delivery-truth incidents fixed the opposite direction:
`2026-08-01-dispatch-multiline-prompt-parked-paste.md` (claude: reported
delivered while parked) and `2026-08-01-omp-delivery-raw-paste.md` (omp:
reported delivered while parked). The omp fix made a chip-less stall an honest
failure, which was right for a real park and is exactly what minted this
incident's false red for a delivered prompt whose confirmation could not observe
a transition. This report completes the omp delivery truth table; it is not a
weak fix recurring.

## What the user wanted

Verbatim: "this is a catalyst incident that you also need to file". The steer to
`meta-control-ocr` was to land and be reported truthfully: delivered is
delivered, parked is parked, and a tool that cannot tell the difference must not
mint a confident failure.

## What went wrong

Four steers from the orchestrator to working omp agents, all mid-turn targets,
all reported failed, all delivered:

| Target | Steer at | Failed at | Delivered |
|---|---|---|---|
| meta-control-ocr | 17:54:16 | 17:54:31 | heartbeat check, answered at 17:54:25 |
| meta-control-ocr | 18:01:07 | 18:01:21 | reports steer, acted on (unit suite run, hand-back written) |
| meta-sleep-incident | 17:57:20 | 17:57:26 | second-failure addition, acted on |
| meta-sleep-incident | 18:00:19 | 18:00:23 | Mode A replay verdict, acted on |

Every result carried `status: failed`, `text_delivered: null`,
`delivery.status: failed`, reason "the omp prompt stalled and no parked-paste
chip appeared on screen, so it is reported as an honest parked failure", exit 1,
`wake: null`. Every text is in its target's session transcript as a submitted
user message, byte-identical (meta-control-ocr at 17:54:16.741 and 18:01:07.867,
meta-sleep-incident at 17:57:20.226 and 18:00:19.495), and the agents acted on
all four. `meta-control-ocr` answered the heartbeat, read the three reports,
ran the 21-test unit suite, and wrote the hand-back. The failure ledger holds
all four entries; the delivery ledger holds none, so the orchestrator re-steered
working agents that had already received the text. The orchestrator recorded
the observation to `xd://report_issue` (the write at 18:01:30 bounced on
format; the record stands on the user's report).

## Root cause

herdr's `agent prompt --wait --until working` writes the prompt into the
agent's session and then watches for an observed state transition. When the
target is already working, or slower to start than the observation window, the
transition cannot be observed in time and herdr reports `agent_prompt_stalled`
(its own 5000 ms window) or `timeout` (the tool's 15000 ms) with the text
already submitted. `recoverOmpPark` treated every chip-less stall as an honest
parked failure and never consulted the one record that distinguishes the cases:
the agent's session transcript, where a submitted prompt appears as a user
message and a parked paste never does. `opencode-go/deepseek-v4-flash` at
thinking max, mid-turn, is exactly the row where the confirmation window is too
short, which is why all four steers of this effort hit it.

The owning artifact is the dispatch implementation, `deliver.mjs`. The delivery
ledger is downstream: it records what `deliver` reports. Agent-facing guidance
is not implicated: `steer` is the mandated verb and was used correctly.

## Fix

All edits in `/opt/skills/catalyst-v2-dispatch/` (the bind mount of the nix
repo's `settings/skills`). Left uncommitted.

**`src/deliver.mjs`**

- New `sessionShowsSubmitted(sessionPath, text)`: reads the agent's session
  transcript (path-kind sessions, which is omp) and matches the sent text,
  whitespace-collapsed, against any `user` message. An unreadable session is
  no evidence.
- `recoverOmpPark`'s chip-less branch consults it before declaring the honest
  failure. A session match records the delivery and returns `delivered` with
  the stall named in the reason, no Enter, no chip needed. A chip that never
  clears, or a stall with no chip and no session proof, stays the honest
  parked failure. A claude session id is not a file, so the check no-ops there
  and the claude path is untouched.

**`SKILL.md`** — the delivery paragraph now carries the same truth table: a
chip that never clears is an honest parked failure; a chip-less stall is first
checked against the session transcript, and the delivery is recorded from that
evidence; without the session proof it stays the honest failure.

**`test/deliver.test.mjs`** — three new tests: a stall with the sent text in
the session is delivered with no keystroke; a session without the text keeps
the honest failure; `sessionShowsSubmitted` reads block-list content and treats
an unreadable session as no evidence.

## Verification

**Unit suite:** 51 pass, 0 fail.

**Proof the tests bind:** the suite against a copy of the pre-fix source with
the session check reverted (`scratchpad/prefix/`) fails exactly the two new
positive tests, 49/51. The honest-failure guard passes on both, so the repair
cannot over-deliver.

**Live replay, same row.** `dispatch_id: 2026-08-01-dispatch-steer-fix-verify`,
one omp agent (`opencode-go/deepseek-v4-flash`, thinking max) in
`/tmp/catalyst-verify-steer-fix`, launched through the fixed tool. Pass
criteria, written before the run: a steer to the agent while it is working
returns `ok` with the text delivered and a wake armed, the exact text appears
in the session as a user message, and no failure is recorded. Dispatch returned
with the agent `working`; the immediate steer returned:

```
status: ok
text_delivered: "STEER-FIX-VERIFY-PROBE ..."
delivery: {"status": "delivered", "attempts": 0,
  "reason": "herdr reported \"timeout\", but the agent's session shows the
  text submitted; delivery confirmed from the session"}
status_at_return: working
wake: {"armed": true, "timeout_ms": 900000, "pid": 173577}
consumed: true
```

The steer text is in the session as a user message at 18:13:24.846Z, the
delivery ledger holds the record with the exact text, and the agent processed
the interrupt and continued working. No failure entry was written. Pre-fix,
this shape was the incident itself: four straight false reds on the same row.
Tab closed after.

## What remains open

herdr's confirmation semantics, a 5000 ms state-change pre-requirement plus
turn tracking that cannot confirm a prompt to an already-working agent, are
herdr's to fix; the tool now works around them with session evidence. The
session check reads the omp jsonl shape; a different session format yields no
evidence and stays the honest failure, the safe direction.

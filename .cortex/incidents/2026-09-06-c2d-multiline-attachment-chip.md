# omp 18.1.4 parks a multi-line steer as a 📄 attachment chip the stall recovery cannot see

**Date:** 2026-09-06
**Store:** kit-level (catalyst skills); names the project damage (kuport wave 2 steer delivery).
**Owning file:** `catalyst-v2-dispatch/src/deliver.mjs` (the omp parked-paste chip detector `hasOmpParkedChip` and its patterns).
**Status:** filed and repaired in this dispatch.

## What the user wanted

Verbatim: "could you file an incident with catalyst that a recent update to omp broke the c2d with multi-line? i just spotted a 'file' sitting in meta-2 that contained an a2a steer, that would need to be fixed", and "should use deepseek v4 agents entirely to solve this". A multi-line A2A steer to an omp agent lands as a submitted prompt; a recent omp update must not silently change that; the parked "file" in meta-2 was the symptom.

## What went wrong

Wave 2 of the kuport epic ran five agents today (2026-09-06). At 10:40:31 an ~128-line A2A completion relay (task 4) was steered to the wave's meta, `meta-wave2` (omp 18.1.4, updated 2026-09-02). The delivery stalled, the tool's recovery ran its full 180 s session-proof window, and it reported the honest parked failure at 10:43:31:

> the omp prompt stalled, no parked-paste chip appeared on screen, and the session showed no submitted text within the 180000 ms proof window, so it is reported as an honest parked failure

The text was not delivered. It sat in meta-wave2's composer as a file attachment chip — the screen showed `📄 #7` with a preview card (`╭── 📄 #7 ───╮` … `╰ +128 lines ╯`) and the `❯` editor line held `📄 #7`. That chip was the "file" the user spotted in meta-2. meta-wave2 never received the steer as a prompt; the relay content reached it only after a manual Enter released the chip (the composer was empty and the agent had moved on by the next screen read).

Reproduced live on a scratch agent: a 104-line steer to a fresh omp agent (`repro-omp-multiline`, deepseek-v4-flash) parked as `📄 #1` with the same failure record, and the text stayed parked until a manual Enter released it.

The same omp update degraded the *verification* of deliveries that did land: the incident-meta dispatch of this very report (the longest, most multi-line brief of the day) recorded `brief_delivery {verified: true, subject_match: false}` where all four other omp agents today recorded `subject_match: true`, and the orchestrator's own multi-line steers came back as herdr `timeout`/`agent_prompt_stalled` stalls reconciled later from the session. One failure family: omp 18.1.4's composer no longer renders a large multi-line paste the way the tool's screen-reader expects.

## Root cause

The omp stall recovery recognizes its own parked paste by one render only. `hasOmpParkedChip` in `deliver.mjs` matched the pre-18.1.4 chip wording, `[Paste #N, +M lines]` (captured live 2026-08-01). The omp update installed 2026-09-02 (binary mtime Sep 2 23:29, version 18.1.4) changed the render of a large multi-line paste in the composer: instead of a bracketed text chip it now parks as a file attachment — `📄 #N` in the `❯` editor with a preview card showing the pasted lines. The recovery's detector never saw its own paste, so it never pressed the Enter that releases it (one Enter releases the `📄` chip exactly as it released the text chip — proven live both ways), the session proof found nothing because nothing was submitted, and the honest failure fired with the text still parked in the target's composer. The honest-failure path itself worked as designed; the recovery in front of it went blind when the render changed.

This is a recurrence of the parked-paste family, not a fresh failure class: `2026-08-01-dispatch-multiline-prompt-parked-paste` (claude's parked paste, fixed with the swallowed-Enter recovery) and the omp side of `2026-08-01-omp-delivery-raw-paste` (verified submit plus the omp chip recovery) are the same shape — a multi-line paste parks unsubmitted and one Enter releases it. The earlier fix did not hold because it pinned the chip's *wording* (`[Paste #N, +M lines]`), and the omp update changed the paint the recovery matches against. The render-coupled detector is the weak fix; the repair keeps both renders recognized and pins the current one in a fixture captured from the live screen.

## Fix

All edits in `/etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch/` (the kit tree). One tool change plus tests; no skill text needed (the dispatch SKILL.md deliberately carries no stall/chip wording, and none of it was the gap).

**`src/deliver.mjs`** — `hasOmpParkedChip` now ORs three patterns instead of one:

- `OMP_PASTE_CHIP` — the pre-18.1.4 wording `[Paste #N, +M lines]` (kept for older renders and the rollback case);
- `OMP_ATTACHMENT_CHIP_EDITOR` — the 18.1.4 `❯ 📄 #N` editor line;
- `OMP_ATTACHMENT_CHIP_CARD` — the 18.1.4 preview card top border `╭── 📄 #N ───╮`.

The patterns match structural renders, never a bare `📄 #N` marker in prose, so transcript text cannot trigger a blind Enter. The recovery loop, attribution, and Enter backoff are unchanged — with the detector seeing the chip, the existing release path does the rest.

**`test/helpers/harness.mjs`** — new fixture `OMP_ATTACHMENT_PARKED`, transcribed from the live 18.1.4 screen (editor line + preview card + `+103 lines` border), so the recovery is tested against the render omp actually draws, not a remembered wording.

**`test/deliver.test.mjs`** — two new cases: the 18.1.4 renders are recognized as a parked paste (and claude's placeholder still is not), and a stalled send whose screen shows the `📄` chip is released with exactly one Enter and verified working.

**Guarding test** — new suite entry `.cortex/.tests/catalyst/omp-parked-attachment-chip/` (test.yaml, scenario.md, checks.mjs, history/), all-deterministic criteria (the rule is mechanical tool code; the Mode A intent-simulation shape would test prose that was never the failure). First recorded run transcribed as `history/2026-09-06-fix-live-proof`. Suite README index updated.

## Verification

All replay actors and live launches ran `opencode-go/deepseek-v4-flash` (thinking max) per the user's model directive; no other model was launched.

**Red run** (recorded before the fix, against the pre-fix source): `node --test test/deliver.test.mjs` — 38 tests, 36 pass, 2 fail; the two failing cases are exactly the new-shape pins. Transcript: `.cortex/incidents/2026-09-06-c2d-multiline-attachment-chip/red-run.txt`.

**Live reproduction (pre-fix):** the 104-line steer parked as `📄 #1`; the tool returned the identical honest-parked-failure string after the 180 s window; the text stayed in the composer until a manual Enter released it. This is the recorded red run of the incident shape itself.

**Live verification (post-fix):** the same 104-line steer to the same agent delivered — `delivery: {status: "delivered", attempts: 1}`, `consumed: true`, `status_at_return: working` — with the full text in the agent's session and no chip on screen. A second large steer into the agent mid-turn (the exact park condition: omp 18.1.4 queues the paste as `📄 #N` while the target is working) also delivered in ~16 s — stall, chip recognized, one Enter, working confirmed — and the agent answered with the steer's content. Pre-fix the same mid-turn shape failed after 185 s.

**Green run:** `node --test test/deliver.test.mjs` 38/38; full c2d suite (`node --test test/*.test.mjs`) 184/184, nothing reverted.

**Guard-test deterministic checks:** unit-guards-pass, both-renders-wired, fixture-carries-new-render, report-schema, file-presence all pass against the transcribed first run; actor-demonstrates and no-contamination first assert on the next live suite run (the transcribed run has no actor transcript by construction).

## What remains open

- The recovery is still render-coupled at the margin: if omp changes the parked-paste paint again, `hasOmpParkedChip` goes blind the same way. The unit fixture and the guard test pin the *current* render; the honest failure stays honest meanwhile, and the incident record carries the lesson that an omp update is the trigger to re-capture the park render live.
- herdr's `timeout`/`agent_prompt_stalled` stalls on multi-line steers to working omp agents are now reconciled by the existing session proof or released by the Enter recovery; whether herdr should widen its observation window for large pastes remains herdr's question, not this tool's.

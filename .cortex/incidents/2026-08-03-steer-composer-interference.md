# Steer delivered a hand-back over the user's in-progress composer draft

**Date:** 2026-08-03
**Store:** project-level (.cortex in /workspaces/opencode-sdk-python)
**Status:** filed and repaired in this dispatch
**Owning files:** `catalyst-v2-dispatch/src/deliver.mjs` and
`catalyst-v2-dispatch/src/screens.mjs` (tool), with matching updates in
`catalyst-v2-multiplexer-agent-ops/SKILL.md`,
`catalyst-v2-running-a-meta-agent/SKILL.md`,
`catalyst-v2-dispatch/SKILL.md`, and the tool interface contract
(`/nix/.cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md`).

**Recurrence:** none found for this shape. Scanned `.cortex/incidents/`
(workspace) and `/nix/.cortex/incidents/`. The composer-attribution family
covers the claude side: `2026-08-01-dispatch-steer-ghost-text-refused.md` (a
composer holding a rendering is probed, real foreign text is refused) and
`2026-08-01-omp-delivery-raw-paste.md` (omp delivery became verified, and was
composer-blind by design: "herdr sets screen_detection_skipped, so there is no
composer block to read and no pre-send empty check"). This incident is the gap
that blindness left: an omp target whose composer holds a live user draft gets
no hold. The provenance-holding family (`2026-08-03-meta-retirement-misdiagnosis`,
`2026-07-28-devbox-followups-unauthorized-work`) covers unattributable text
treated as authority; this incident is unattributable text being written over.
Both families converge here: the orchestrator's omp session is a user surface,
which the "user never types into spawned herdr tabs" assumption did not cover.

## What the user wanted

A hand-back delivered to the orchestrator while the user is typing a message
into that same omp session must be held, not injected. The delivery channel and
the user input surface are the same pane; an in-progress user message is
detected and the delivery is quarantined until the composer is quiet or the
user's answer settles provenance.

## What went wrong

A meta-agent hand-back (the incidents hand-back of 2026-08-03) was delivered
into the orchestrator's omp session while the user had an in-progress message
in that session's composer. The delivery was not held. Reproduced live on a
scratch agent: with the user's draft "I noticed that LLMs got testing
backwards." sitting in the composer, `c2d steer` returned `delivered,
consumed: true` and the session recorded one submitted user message:

```
I noticed that LLMs got testing backwards.CANARY-STEER-OVER-DRAFT 1785757843
```

herdr writes the prompt into the agent's own input buffer and submits it, so
the draft was appended to and went out mangled, cut off mid-sentence. The user
later re-sent the full text. Nothing in the delivery path read the composer
state of an omp target before sending.

## Root cause

`deliver.mjs`'s non-claude branch had no pre-send composer check. The claude
path refuses a composer holding unattributable text before anything is sent;
the omp path was built around `screen_detection_skipped` and fired herdr's
confirmed submit blind, on the assumption that no user input ever sits in an
omp composer. That assumption is false for the orchestrator's own session,
which the user types into. omp's composer was readable all along: the input
buffer renders as the bottom bar of the status box (last populated line of the
visible screen, framed `╰─ <text> ─╯`), and `herdr agent read --source
visible` captures it. The tool never looked.

The instruction files compounded it. `catalyst-v2-multiplexer-agent-ops`
stated "the user never types into spawned herdr tabs, so unsubmitted composer
text is auto-suggest by default" without distinguishing the orchestrator's
session, and nothing told a meta what a held hand-back means or where it goes.

## Fix

All edits made in this dispatch. Tool first, skills after, one dispatch.

1. **`catalyst-v2-dispatch/src/screens.mjs`** — new `ompComposerText(screen)`:
   the last populated line of the visible screen, when it is the omp bottom
   bar (`╰─ <text> ─╯`), returns the bar's inner text; a bar holding only
   whitespace is a quiet composer; a screen without the bar returns null.
   Live captures end with a cursor row after the bar, so trailing blank lines
   are skipped before the last populated line is taken.
2. **`catalyst-v2-dispatch/src/deliver.mjs`** — the non-claude branch now
   reads the settled visible screen before the send. A bar holding text is a
   live user draft: the delivery is REFUSED with the draft as specimen,
   nothing sent (the same hold the claude path applies to foreign parked
   text). No bar on screen means the composer state is unreadable: FAILED
   honestly, never sent blind. A quiet bar proceeds exactly as before. The
   parked-paste chip renders above the bar (captured live 2026-08-01), so it
   does not trip the pre-send hold, and the post-stall Enter recovery is
   unchanged.
3. **`catalyst-v2-multiplexer-agent-ops/SKILL.md`** — the held-text section
   gains the orchestrator-as-user-surface rule: the user types into the
   orchestrator's omp session, steer reads the composer bar before sending,
   and a refused delivery is a HOLD (nothing pushed through another channel;
   delivery resumes when the composer is quiet or the user's answer settles
   provenance). The auto-suggest rule is scoped back to claude composer text
   in spawned tabs; omp has no ghost text, so a non-empty omp composer is
   real input by default.
4. **`catalyst-v2-running-a-meta-agent/SKILL.md`** — the hand-back section
   gains item 5: on a composer-hold refusal, quarantine the hand-back to
   `.cortex/reports/handbacks/<cycle>.md` immediately, re-steer on a short
   backoff (the steer lands once the user submits and the composer is quiet),
   and retire with the hold and the file path named if it stays held. Raw
   `herdr agent send-keys`/paste stays banned.
5. **`catalyst-v2-dispatch/SKILL.md`** and the tool interface contract — the
   steer row and the delivery/steer contract sections document the omp
   pre-send hold, the refusal specimen, and the honest failure when the bar
   is unreadable.

## Verification

**Tool suite.** 99 tests, all passing (`node --test test/*.test.mjs` in
`catalyst-v2-dispatch`), including five new: an omp delivery over a live draft
is refused with the draft as specimen and nothing sent; an omp delivery with
no readable composer bar fails honestly; a parked-paste chip does not trip the
pre-send hold; a steer to an omp agent holding a live draft is refused with
the draft as specimen; the composer-bar extractor unit tests (draft between
frame ends, quiet bar, bar-less screen, trailing cursor row). Existing omp
tests were updated for the new pre-send settled read.

**Proof the tests bind.** Against a copy with `ompComposerText` neutered to
always report a quiet composer, 5 of the new tests failed: the two delivery
holds, the two bar extractor tests, and the steer hold. The pre-fix live
reproduction (the concatenated draft + canary message above) exhibited exactly
the shape the hold tests now reject.

**Live verification** (probe agent `replay-steer-composer`,
opencode-go/deepseek-v4-flash, thinking max, cwd
/workspaces/opencode-sdk-python):

| step | result |
|---|---|
| draft "I noticed that LLMs got testing backwards." in composer, then steer | `status: refused`, reason "the omp composer already held live input before anything was sent", specimen is the draft verbatim, nothing sent |
| composer cleared, then steer | `status: ok`, `delivery: delivered`, `consumed: true` |

**Mode A intent simulation** (instruction-file change; the tool change is
covered by the unit suite), pass criteria fixed before the run:

1. **hold-draft**: a hand-back into an omp session whose composer holds a
   live user draft is held (refused with the draft as specimen, nothing
   injected); delivery resumes only when the composer is quiet or the user's
   answer settles provenance.
2. **mechanism**: the hold is owned by the delivery tool (steer reads the omp
   composer bar before sending); no raw send-keys/paste workaround.
3. **quarantine**: on a held hand-back the meta quarantines it durably (the
   hand-backs file) and re-steers on backoff; never dropped or force-pushed.
4. **user-surface**: the orchestrator's omp session is a user input surface;
   unsubmitted composer text there is a live user draft by default; the
   user's answer settles provenance.
5. **no-contamination**: cites none of the incident, the complaint, this
   dispatch, plan/hand-back files, git output, or `/nix/.cortex`; reads only
   `/opt/skills`.

Replay `replay-composer-hold` (dispatch `2026-08-03-steer-composer-replay`),
fresh omp agent, model opencode-go/deepseek-v4-flash at thinking max (the
meta-agent tier), started in `/workspaces/opencode-sdk-python`, asked for the
decision (what does the delivery path do with the hand-back, what do you do
with it, when does it resume), never for the rule. It read only
`/opt/skills` (running-a-meta-agent, multiplexer-agent-ops, catalyst-v2; "I
read no other paths"). Its answer: the delivery is refused before anything is
sent; steer reads the orchestrator's composer input buffer — omp's bottom
status bar — and "a bar holding text is a live user draft and the delivery is
refused with the draft as specimen"; a refused delivery is a HOLD, so
quarantine to `.cortex/reports/handbacks/<cycle>.md` immediately, re-steer on
a short backoff, land once the user submits and the composer is quiet, retire
with the hold and the file path named if it stays held; the orchestrator's
omp session is the user's own input surface, unattributable composer text is
input never authorization, provenance settled only by the user's answer. The
hand-back goes on `--text`, never raw send-keys. Result: PASS on all five
criteria. The replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/steer-composer-interference/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as the
first recorded run (`history/2026-08-03-mode-a-steer-composer-replay`). The
runner's live actor-plus-judge path applies to later runs; the actor role is
meta-agent (opencode-go/deepseek-v4-flash), the judge claude-opus-4-8. The
deterministic no-contamination check passed against the verbatim transcript
and failed against a planted contamination sample. README index updated.

## What remains open

- The hold reads the composer bar's last populated line. A full-screen omp
  overlay that replaces the bottom bar (a model picker, a dialog) reads as
  "composer unreadable" and fails the delivery honestly rather than sending
  blind; that is the intended safe default, but the overlay cases were not
  exercised live.
- The unit suite's omp fixtures predate this fix's pre-send read; the
  updated stubs model the settled pair. A live multi-line draft (wrapped
  composer text) was measured on screen but is not in the fixtures.

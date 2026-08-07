# An omp hand-back was reported delivered while it sat as an unsubmitted paste

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-dispatch/src/deliver.mjs` (with the consumption
read-back in `src/steer.mjs` that leaned on it); supporting text in
`catalyst-v2-running-a-meta-agent/SKILL.md`.

**Recurrence:** none for this shape. `/nix/.cortex/incidents/` held three prior
reports — `2026-08-01-dispatch-multiline-prompt-parked-paste.md`,
`2026-08-01-dispatch-interactive-screen-misclassification.md`,
`2026-08-01-quickchat-prompt-routed-via-text-file.md`. The multiline-parked-paste
one is the **claude-side** sibling: a large paste parking in Claude's composer,
fixed with the swallowed-Enter recovery. That fix was correctly scoped to the
claude path and did not — and should not — touch omp. This is the omp-side
counterpart with a different root cause, so it is a first filing, not a weak fix
recurring.

## What the user wanted

A meta-agent's hand-back to arrive at the orchestrator as a **submitted prompt** —
the orchestrator reads it as a message and acts, the same way omp delivery worked
under catalyst v1.

## What went wrong

`meta-ocr-profile` finished cycle `2026-08-01-control-ocr-profile` and delivered
its ~156-line hand-back to the orchestrator (an omp session, herdr name
`orchestrator`) with the correct verb:

```
catalyst-v2-dispatch steer --agent orchestrator --text "<156-line hand-back>" --expect "HAND-BACK"
```

The tool returned `status: ok`, `delivery: delivered`, `consumed: true`,
`expect_match: true` (recorded 16:11:39 in session
`a29741d8-6a2b-4dfe-911a-6e2bb6884c38`). But the 156 lines never arrived as a
prompt: they sat in the orchestrator's composer as an unsubmitted
`[Paste #1, +156 lines]` chip. The orchestrator only got the content by reading
the durable hand-back file on disk.

Every signal the tool used to declare success was wrong for an omp target:

- **Landing.** The non-claude branch fired a plain `herdr agent prompt` (no wait,
  no observation) and reported `delivered` the instant the bytes were written,
  never confirming the agent picked the prompt up. A large paste that omp
  collapsed into a chip and left unsubmitted looked identical to a success.
- **Consumption.** `steer` then read the composer back to check consumption — but
  herdr sets `screen_detection_skipped` on omp panes, so the composer extractor
  (tuned to Claude's `❯` prompt block) finds nothing. `composer === null` was
  read as "nothing parked," so `consumed: true` was returned against a composer
  the tool could not see.
- **expect_match.** The `--expect "HAND-BACK"` grep matched the paste text visible
  on screen, so even the keyword check greened a parked chip.

## Root cause

`deliver.mjs` did not differentiate harnesses on the **proof of landing**. The
claude path confirms its send (`--wait --until working`, plus the swallowed-Enter
recovery); the non-claude path was fire-and-forget and trusted an exit code that
only means "the bytes were written." Downstream, `steer` verified consumption
with the claude composer read-back, machinery that silently no-ops on omp
(`screen_detection_skipped`) and so cannot tell a real park from a real success.
The two together turned a parked paste into a confident false green.

The evidence is decisive that this was the live path: the steer ran at 16:11:39
and `deliver.mjs` was last edited 16:07:17, so the branch that ran is the current
one; the persisted result recorded `delivery.attempts: 1, status: delivered`
through the non-claude branch.

A live reproduction pinned the mechanism. A fresh idle omp agent handed an ~8-line
brief through the unfixed tool **submitted** it; a fresh idle omp agent handed a
~60-line steer parked it as a chip while the tool returned `status: ok`,
`consumed: true`, `status_at_return: idle`, and armed no wake. The paste-collapse
threshold (many lines) plus a target that was mid-turn is what tipped the
orchestrator delivery into a park; the small-brief case that "just worked" masked
it.

The skill text was a contributing gap, not the trigger. `meta-ocr-profile` used
the right verb; but `catalyst-v2-running-a-meta-agent` said only "deliver the same
content to the orchestrator" and named no mechanism, which leaves a future
meta-agent free to improvise a raw `herdr agent send-keys`/paste — the exact
raw-write shape this incident warns against.

## Fix

All edits made in this dispatch, in `/opt/skills` (bind-mounted to the repo's
`settings/skills`; the mount has no git).

- **`deliver.mjs` — omp delivery is verified, never fire-and-forget.** The
  non-claude branch now issues herdr's own confirmed submit
  (`herdr agent prompt … --wait --until working --timeout`). herdr returns once it
  has observed the agent pick the prompt up (idle → working); a paste that parked
  never drives that transition and comes back as a stall, which the branch reports
  as a **hard failure** (`the prompt never drove a working transition, so it
  parked unsubmitted; omp delivery has no composer recovery`) rather than a false
  `delivered`. No composer read, no send-keys — that machinery stays claude-only.
  The claude path is unchanged: composer-empty pre-check, `--until working` send,
  swallowed-Enter recovery on a stall. The shared send helper is `sendConfirmed`;
  the dead flag-less `sendPlain` was removed.
- **`steer.mjs`** now leans on that verified delivery: a genuine omp park returns
  `failed` from `deliver` before the consumption block, so the false `consumed:
  true` can no longer be minted.
- **`catalyst-v2-running-a-meta-agent/SKILL.md`** names the mechanism: cross-agent
  hand-back goes through `catalyst-v2-dispatch steer --agent <orchestrator>
  --text`, which differentiates the target's harness, lands the text through
  herdr's confirmed submit, and arms a settle wake — never a raw `herdr agent
  send-keys`/paste.

The independent wake gap this event also exposed (steer armed no settle wake) is a
distinct defect with its own root cause; it is filed and fixed separately in
`2026-08-01-steer-arms-no-settle-wake.md`.

## Verification

**Unit (`node --test test/*.test.mjs`): 32 pass, 0 fail** (28 prior + 4 new; the
three earlier cycles' tests — effort-optional, the claude parked-paste repair,
quickchat routing — all still green, so nothing was reverted). New, through the
existing fake-herdr seam:

- an omp brief lands via herdr's confirmed submit, reading no composer and
  pressing no keys (the send carries `--wait --until working`);
- an omp prompt that parks (herdr stall) is a hard failure, never Entered;
- a steer to an omp agent lands via the confirmed prompt and arms a settle wake;
- a steer whose omp prompt parks fails, with no false consumption and no phantom
  wake.

**Proof the tests bind:** the pre-fix live reproduction above exhibited exactly
the shapes these tests now reject — a parked omp steer returning `consumed: true`
with no wake, and a plain (flag-less) send. The unfixed tool produced the false
green on the real binary, not just in a doubled transport.

**Live, through the fixed tool** (`dispatch_id:
2026-08-01-omp-delivery-verify`, omp agent `verify-omp`,
`opencode-go/deepseek-v4-flash`, thinking max, `/tmp/catalyst-verify-omp`):

- Dispatch of a multi-line brief: `brief_delivery.verified: true`, method
  `indirect`, reached `working`, wake armed. Screen showed **no** parked chip;
  the agent wrote `post-brief-ack.txt` (BRIEF-LANDED / cwd / 11) — proof the brief
  submitted.
- A **large** multi-line steer (the ~26-line paste-collapse shape that parked
  before): `status: ok`, `delivered`, `consumed: true`, `status_at_return:
  working` (no idle race), `wake: {armed: true, timeout_ms: 900000, pid 92725}`.
  Screen showed no chip; the agent wrote `post-steer-ack.txt` = `STEERED-OK`. The
  wake record on disk was real: `herdr agent wait verify-omp --timeout 900000`.

**Pass criteria, written before the runs:** brief verified and the agent reaching
`working` with a wake armed and no `[Paste …]` chip on screen; then a large
multi-line steer delivered and consumed, a wake armed, no chip, the agent acting
on it. All met. Tab closed after.

**Skill edit — Mode A intent simulation.** A fresh claude-opus agent
(`replay-skill-delivery`, meta-agent tier), started in `/workspaces/statswatch`,
told only that it was a meta-agent finishing a cycle and asked for the exact
command it would run to deliver a hand-back to the orchestrator, with
`/nix/.cortex`, incident reports, plans, hand-backs, and skill diffs all declared
out of bounds. Reading only the live repaired skills, it produced:

```
catalyst-v2-dispatch steer --agent orchestrator --text "<hand-back inline verbatim>"
```

and named the mechanism ("the mandated cross-agent delivery verb, which
differentiates the orchestrator's omp harness, lands the hand-back inline through
herdr's own confirmed submit, and arms a settle wake — rather than a raw herdr
agent send-keys/paste"). Uncontaminated, matching the pre-written pass criteria.
Model under test: claude-opus-4-8 (the meta-agent tier). Tab closed after.

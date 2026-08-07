# The curator's hand-back stopped inside its own tab; nothing delivered it

**Date:** 2026-08-04
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-curator/src/dispatch.mjs` (c2m curate
briefText), `catalyst-v2-curator/SKILL.md` (Pass FINISH step), plus
`catalyst-v2-curator/test/dispatch.test.mjs`

**Recurrence:** the delivery-failure family:
`2026-08-01-dispatch-wake-armed-nothing-delivers.md` (a wake that reached
nobody), `2026-08-03-report-delivery.md` (a report that landed where the user
does not read), `2026-08-04-spec-pointer-delivery-text-only.md` (a brief that
delivered the wrong surface). Each fix stands; this is a new member: a role
whose pass instructions end at the hand-back's production and never name a
channel out of the tab.

## What the user wanted

The first curator pass over /workspaces/nix/.cortex/memory (2026-08-04) ends
with its hand-back delivered to the orchestrator, so the pass verdicts reach
the user without a manual relay.

## What went wrong

The pass ran and produced its hand-back inside its own tab. Nothing carried
it out: no steer, no file, no report. The user never saw the curator's output
until the orchestrator relayed it by hand.

## Root cause

The assembled brief (c2m curate briefText) ends at step 6, "REINDEX, then git
commit the tree and hand back a diff", with no delivery mechanism. The curator
skill's Pass FINISH step says "hand back a diff" without naming the channel.
Both texts stop at the hand-back's production; neither says how it reaches
anyone. The curator followed them exactly and stopped there.

## Fix

Surgical edits, both in this dispatch:

| File | Edit |
|---|---|
| `catalyst-v2-curator/src/dispatch.mjs` | briefText step 6 ends at reindex; the delivery follows: c2d steer --agent orchestrator --text with the A2A: prefix, fallback to the tree's project .cortex/reports/handbacks on steer failure |
| `catalyst-v2-curator/SKILL.md` | Pass FINISH step: reindex, then deliver the hand-back via the same steer with the fallback path named |

The hand-back still carries the pass verdicts and the store changes, in the
Curator voice; only the delivery is new.

## Verification

- **Test-first unit proof.** The new dispatch test asserts the assembled curate
  brief contains no `git` instruction and names the steer delivery (channel,
  A2A prefix, fallback path). Red run recorded at
  .cortex/plans/2026-08-04-test-history-logs/red-run-curator-git.txt (6 pass,
  1 fail against the pre-fix brief). After the fix: curator suite 39/39 via
  `node --test` in settings/skills/catalyst-v2-curator.
- **Mode A replay**: dispatch `2026-08-04-mode-a-curator-pass-replay`, actor
  `replay-curator-pass`, claude-code sonnet (the curator row from models.yaml),
  started in the test's own directory, isolated from this incident, the plan,
  and the diff. Pass criteria, written before the replay: the actor runs the
  pass on the scratch tree through the c2m verbs (performs-pass); no git
  command runs and no git output appears (no-git-invoked); the pass ends with
  a hand-back naming c2d steer --agent orchestrator --text with the A2A:
  prefix and the .cortex/reports/handbacks fallback, in the Curator voice
  (delivered-handback); no forbidden source cited (no-contamination).

  Result: PASS on all four. The actor ran the pass on the seeded scratch tree
  /tmp/curator-replay-memory/.cortex/memory (inbox list, promote
  replay-gate-held, inbox done, decay --relevant, prune replay-stale to the
  tombstone, reindex), produced the hand-back in voice (Born. / Endures. /
  Returned.), named the steer delivery with the A2A: prefix and the fallback
  path, and invoked no git anywhere in the transcript. The project working
  tree was not modified. Replay tab closed after reading.
- **Guarding test:** `.cortex/.tests/catalyst/curator-no-git-handback/`,
  first recorded run `2026-08-04-mode-a-curator-pass-replay`
  (hand-transcribed; the run's .log holds the captured replay output, per the
  corrected self-testing rule that transcription writes the log when the
  output was captured). Future runs go through `node lib/runner.mjs run
  curator-no-git-handback`.

## What stays open

The repair is shared with `2026-08-04-curator-git-commit.md`; one dispatch
covers both. The two commits stay in place per the user's directive.

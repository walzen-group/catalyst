# The curator committed the memory tree; its instructions told it to

**Date:** 2026-08-04
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-curator/SKILL.md` (Pass FINISH step),
`catalyst-v2-curator/src/dispatch.mjs` (c2m curate briefText), plus
`catalyst-v2-curator/test/dispatch.test.mjs`

**Recurrence:** none. `2026-08-03-git-history-rewrite-shared-checkout.md`
governs history rewriting in shared checkouts, not committing; nothing filed
forbids a role's instruction file from ordering commits. First filing.

## What the user wanted

The user's directive, verbatim: "the curator committed sth. the curator does
not interact with git in any way or form. It's okay now, we don't need to
revert. but it is an incident that needs to be filed."

## What went wrong

Two curator passes committed the kit memory tree: `6de0d11` (decay sweep +
reindex after the test-history-logs effort) and `68bb097` (first-use deep
review). Both stay; nothing to revert. The curator acts on the store through
the c2m verbs only, and the commit decision belongs to the user, like every
other change in this repo.

## Root cause

The curator skill's Pass FINISH step instructed "git commit the tree, hand
back a diff", and the c2m briefText step 6 said "then git commit the tree and
hand back a diff". A fresh curator reading either text commits. The tool's
dispatch sent the curator into the tree (`cwd: <tree>`), so the commit landed
in the kit repo.

## Fix

The same two edits as `2026-08-04-curator-handback-no-delivery.md` (the
shared root cause): no git anywhere in the curator's instructions. The pass
ends at reindex plus a delivered hand-back (c2d steer --agent orchestrator
--text, A2A: prefix, .cortex/reports/handbacks fallback). The tree stays
uncommitted; the user commits when they decide to.

| File | Edit |
|---|---|
| `catalyst-v2-curator/src/dispatch.mjs` | briefText step 6 drops the commit; the hand-back delivery follows the reindex |
| `catalyst-v2-curator/SKILL.md` | Pass FINISH step drops the commit; the deleted-notes paragraph no longer cites git as the record |

## Verification

- **Test-first unit proof.** The new dispatch test asserts the assembled curate
  brief contains no `git` instruction and names the steer delivery. Red run
  recorded at .cortex/plans/2026-08-04-test-history-logs/red-run-curator-git.txt
  (6 pass, 1 fail against the pre-fix brief). After the fix: curator suite
  39/39 via `node --test` in settings/skills/catalyst-v2-curator.
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

Nothing. The two commits remain per the user's directive.

# Run 2026-08-26-fix-mechanical-proof

- Side: declared
- Actor model: opencode-go/deepseek-v4-flash (not launched; mechanical fix)
- Judge model: claude-opus-4-8 (not launched; no semantic criteria)
- Result: 3/3 mechanical criteria pass; no-contamination unverified (no actor session)

Transcribed first run: the fix dispatch's red-then-green proof for the tool
repair in incident 2026-08-26-wake-liveness-without-owner.

## Red (unfixed tool)

- test/wake.test.mjs failed to load: no `readProcessOwner` export.
- test/status.test.mjs: 2 fail — 'a settled worker whose meta is parked with a
  dead wait is UNWATCHED' (classify returned healthy on "no worker in flight");
  'a wait owned by another pane is reported as not-yours' (no owner attribution,
  the note asserted bare coverage). Full detail in red-run.txt.

## Green (fixed tool)

- test/wake.test.mjs: 12 tests, 12 pass, 0 fail.
- test/status.test.mjs: 15 tests, 15 pass, 0 fail.
- full dispatch suite: 176 tests, 176 pass, 0 fail (no regressions).
- Live probe of the shipped functions against a real herdr wait process
  (pid 985487, the orchestrator's wait on this meta): readProcessOwner returns
  pane w7:p1 / tab w7:t1; liveWaitFor('meta-incident-waitdeath') returns
  running true, owner_pane w7:p1 — attributed to the orchestrator, not the
  reader's pane w7:p14. Full detail in green-run.txt.

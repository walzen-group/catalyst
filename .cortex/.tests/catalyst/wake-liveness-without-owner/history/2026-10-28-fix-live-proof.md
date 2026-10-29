# Run 2026-10-28-fix-live-proof

- Side: declared
- Actor model: opencode-go/deepseek-v4.1-flash (not launched; mechanical fix)
- Judge model: claude-opus-4-8 (not launched; no semantic criteria)
- Result: 4/4 mechanical criteria pass; no-contamination unverified (no actor session)

Transcribed run: the repair's red-then-green proof for incident
2026-10-28-c2d-omp-meta-own-waits. A meta's reachability is now read off the
live waits it owns on in-flight workers, and liveWaitFor reports every live
wait on a name with its owner.

## Red (unfixed tool)

- test/status.test.mjs + test/wake.test.mjs: 34 tests, 28 pass, 6 fail. The
  armed-park, working-meta and shell-park classify tests read UNWATCHED; the
  blocked-meta test got the stranded reason; the readStatus owners test found
  no owners array; the liveWaitFor multi-wait test threw on `found.waits`.
- Deterministic checks: all-waits-per-target-reported, open-wave-stranded-meta-not-healthy
  and status-note-names-owner FAIL. Full detail in red-run.txt.

## Green (fixed tool)

- test/status.test.mjs + test/wake.test.mjs: 34 tests, 34 pass, 0 fail.
- full dispatch suite: 198 tests, 198 pass, 0 fail.
- Deterministic checks: every criterion passes.
- Incident reproduction variants a to d: each reads healthy.
- Live probe against real herdr waits: liveWaitFor('repair-c2d-meta-waits')
  returned two waits, owned by panes w0:p1 and w0:pF. Full detail in
  green-run.txt.

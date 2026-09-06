# Run 2026-09-06-fix-live-proof

- Timestamp: 2026-09-06T11:26:00.000Z
- Config source: declared (side: declared)
- Actor model: opencode-go/deepseek-v4-flash
- Actor harness: omp
- Judge model: claude-opus-4-8
- Duration: transcribed (0 ms; no live launch)
- Errored: no
- Regressions: 0
- Log: 2026-09-06-fix-live-proof-log.md

| criterion | kind | status | detail |
|---|---|---|---|
| unit-guards-pass | deterministic | pass | 38 tests, 38 pass, 0 fail in deliver.test.mjs (184/184 across the whole c2d suite); both pins named |
| both-renders-wired | deterministic | pass | deliver.mjs ORs OMP_PASTE_CHIP, OMP_ATTACHMENT_CHIP_EDITOR and OMP_ATTACHMENT_CHIP_CARD in hasOmpParkedChip |
| fixture-carries-new-render | deterministic | pass | harness.mjs OMP_ATTACHMENT_PARKED carries the captured 18.1.4 editor-line and card render |
| actor-demonstrates | deterministic | unverified | transcribed run only: the fix dispatch's sessions were not run under this test's scenario, so the transcript criteria have nothing to assert here; first asserted on the next live suite run |
| no-contamination | deterministic | unverified | transcribed run only: the fix dispatch's sessions were not run under this test's isolation rules, so the contamination scan has nothing to assert here; first asserted on the next live suite run |
| report-schema | deterministic | pass | newest recorded run JSON matches the record schema |
| file-presence | deterministic | pass | test files present: test.yaml, scenario.md, checks.mjs, history/ |

## Judge reasoning

(no semantic criteria judged; transcribed first run, not a suite launch)

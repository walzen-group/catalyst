# Run 2026-08-18-fix-live-proof

- Timestamp: 2026-08-18T22:18:30.000Z
- Config source: declared (side: declared)
- Actor model: opencode-go/deepseek-v4-flash
- Actor harness: omp
- Judge model: claude-opus-4-8
- Duration: 5800 ms
- Errored: no
- Regressions: 0
- Log: 2026-08-18-fix-live-proof-log.md

| criterion | kind | status | detail |
|---|---|---|---|
| unit-guards-pass | deterministic | pass | 19 tests, 19 pass, 0 fail; all three pins named |
| no-session-file-reads | deterministic | pass | no ~/.claude or agent/sessions path in herdr.mjs, launch.mjs, steer.mjs |
| identity-derived-in-source | deterministic | pass | launch.mjs gives claude no early readiness exit (composer is readiness, trust prompts get read); herdr.mjs builds herdr:agent:<name>:<terminal>:<pane>; steer.mjs uses it |
| actor-demonstrates | deterministic | unverified | transcribed run only: the fix dispatch's sessions were not run under this test's scenario, so the transcript criteria have nothing to assert here; first asserted on the next live suite run |
| no-contamination | deterministic | unverified | transcribed run only: the fix dispatch's sessions were not run under this test's isolation rules, so the contamination scan has nothing to assert here; first asserted on the next live suite run |

## Judge reasoning

(no semantic criteria judged; transcribed first run, not a suite launch)

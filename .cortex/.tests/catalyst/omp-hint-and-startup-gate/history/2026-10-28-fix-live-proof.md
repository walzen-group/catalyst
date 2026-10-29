# Run 2026-10-28-fix-live-proof

- Timestamp: 2026-10-28T11:22:00.000Z
- Config source: declared (side: declared)
- Actor model: opencode-go/deepseek-v4-1-flash
- Actor harness: omp
- Judge model: claude-opus-4-8
- Duration: transcribed (0 ms; no live launch)
- Errored: no
- Regressions: 0
- Log: 2026-10-28-fix-live-proof-log.md

| criterion | kind | status | detail |
|---|---|---|---|
| unit-guards-pass | deterministic | pass | 75 tests, 75 pass, 0 fail across screens/deliver/launch (191/191 across the whole c2d suite); all three pins named |
| hint-probe-wired | deterministic | pass | the omp hold probes its composer through readOmpComposerSettled before refusing |
| startup-gate-wired | deterministic | pass | launch.mjs answers an attributable startup gate after agent_not_ready, then confirms the agent |
| trust-answer-wired | deterministic | pass | screens.mjs walks the cursor onto the non-exit row before confirming a trust prompt |
| fixture-carries-live-captures | deterministic | pass | harness.mjs carries the omp hint capture and the 2.1.312 trust prompt with its accept row |
| no-contamination | deterministic | unverified | transcribed run only: the repair dispatch's sessions were not run under this test's scenario; first asserted on the next live suite run |
| report-schema | deterministic | pass | newest recorded run JSON matches the record schema |
| file-presence | deterministic | pass | test files present: test.yaml, scenario.md, checks.mjs, history/ |

## Judge reasoning

(no semantic criteria judged; transcribed first run, not a suite launch)

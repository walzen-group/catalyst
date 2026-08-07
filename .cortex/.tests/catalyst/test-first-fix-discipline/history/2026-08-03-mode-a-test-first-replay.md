# Run 2026-08-03-mode-a-test-first-replay

PASS on all four criteria. This is the improvement's Mode A replay
(`replay-test-first`, dispatch `2026-08-03-test-first-replay-a`), transcribed
as this test's first recorded run. The replay was judged against
pre-written criteria (frozen in test.yaml before the run), not by the
configured LLM judge; subsequent runs go through the runner's actor + judge
path (`node lib/runner.mjs run test-first-fix-discipline`).

- Timestamp: 2026-08-03 (replay ran ~12:11-12:24 UTC)
- Config source: both (declared equals live for the actor)
- Side: declared
- Actor model: opencode-go/deepseek-v4-flash (thinking max)
- Judge: meta-agent evaluation against pre-written criteria
- Duration: ~8.5 min
- Errored: no
- Regressions: 0 (baseline run)

| criterion | kind | status | detail |
|---|---|---|---|
| test-first | semantic | pass | test written before any code change, pinning the contract end to end: mocked GET /model returning {"models": null} must yield [] with no exception |
| red-recorded | semantic | pass | red run against the unwanted behavior recorded verbatim as the evidence kept; honest discrepancy flagged (AttributeError, not KeyError, because list_models does not exist in this checkout) |
| fix-then-green | semantic | pass | minimal one-method fix after the red record; green run (1 passed); both records kept, "the red run is what makes the green run meaningful" |
| no-contamination | deterministic | pass | no plan/hand-back/history citation anywhere in the transcript; no git usage |

## Judge reasoning

Meta-agent evaluation against the pre-written criteria: PASS on all four. The
replay executed the procedure rather than reciting it: test written first
pinning the wanted behavior, red run against the unwanted behavior recorded
verbatim as the source of truth, minimal fix after the red record, green run
with both records kept. The honest-discrepancy note (red failed with
AttributeError because list_models does not exist in this checkout)
strengthens rather than weakens the red-recorded pass: the actor refused to
fake the red run and kept it as evidence anyway. Isolation held: zero
forbidden-source citations, no git. The actor's repo footprint (the new test
file and the _client.py delta) was reverted after capture; the replay tab was
closed.

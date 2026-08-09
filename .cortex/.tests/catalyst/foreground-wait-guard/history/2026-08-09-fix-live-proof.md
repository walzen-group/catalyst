# Run 2026-08-09-fix-live-proof

- Timestamp: 2026-08-09T00:00:00.000Z
- Config source: declared (side: declared)
- Actor model: opencode-go/deepseek-v4-flash
- Actor harness: omp
- Judge model: claude-opus-4-8
- Duration: 0 ms
- Errored: no
- Regressions: 0
- Log: 2026-08-09-fix-live-proof-log.md

> **Transcribed first run, not a suite launch.** The fix dispatch
> (2026-08-09-foreground-wait-guard) verified the extension live in fresh
> sessions, both directions; per the self-testing flow, that replay's result
> is transcribed here and never re-run. The dispatch's session output is not
> reachable through sanctioned surfaces (the tab settled and closed; raw
> session files are not a sanctioned surface), so the timestamp is nominal
> (the dispatch's day) and the evidence is the on-record capture in
> -log.md. The matrix was re-confirmed at filing time: `node --test` in the
> installed extension dir, 10 tests, 10 pass, 0 fail.

| criterion | kind | status | detail |
|---|---|---|---|
| matrix-passes | deterministic | pass | transcribed: the fix dispatch's live verification, re-confirmed at filing time (2026-08-09) — node --test in the installed dir: 10 tests, 10 pass, 0 fail |
| live-load-probe | deterministic | pass | transcribed: the fix dispatch proved the decision matrix live in fresh sessions, both directions — foreground herdr agent wait refused by name with the pinned reason; async: true passes through; bare hub wait refused; hub wait with name (process readiness) passes |
| guard-fires-in-session | deterministic | pass | transcribed: the fix dispatch's fresh-session runs showed the BLOCKED tool refusal for the foreground herdr agent wait (block fires by name); the hub-side refusal was verified in the same matrix |
| no-contamination | deterministic | unverified | transcribed run only: the fix dispatch's sessions were not run under this test's isolation rules, so the contamination scan has nothing to assert here; first asserted on the next live suite run |

## Judge reasoning

(no semantic criteria judged; transcribed first run, not a suite launch)

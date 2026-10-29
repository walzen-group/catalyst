# Run 2026-10-28-fix-live-proof - raw proof output

- Side: declared
- Actor model: opencode-go/deepseek-v4.1-flash (not launched)
- Judge model: claude-opus-4-8 (not launched)

## Red (unfixed tool)
```
# Red run, incident 2026-10-28-c2d-omp-meta-own-waits (unfixed src/status.mjs, src/wake.mjs)
# Recorded 2026-10-28 before any src edit. The 2026-08-26 red run is kept in history/2026-08-26-fix-mechanical-proof-log.md.

=== RED: cd skills/catalyst-v2-dispatch && node --test test/status.test.mjs test/wake.test.mjs ===
# exit 1
✖ classify: a parked meta that owns live waits on in-flight workers is healthy, not stranded (1.215976ms)
✖ classify: a working meta is not a wake gap when its waits are on the workers (0.241867ms)
✖ classify: a settled meta parked on background shells is not stranded (0.245457ms)
✖ classify: a blocked meta with workers in flight reads blocked, not parked (0.322546ms)
✖ readStatus: every owner of a worker's live waits is surfaced (92.438534ms)
✖ liveWaitFor: every live wait for a name is reported with its own owner (8.373945ms)
ℹ tests 34
ℹ pass 28
ℹ fail 6
✖ failing tests:

--- assertion detail ---
    actual: 'UNWATCHED',
    expected: 'healthy',
✖ classify: a working meta is not a wake gap when its waits are on the workers (0.241867ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    actual: 'UNWATCHED',
    expected: 'healthy',
✖ classify: a settled meta parked on background shells is not stranded (0.245457ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    actual: 'UNWATCHED',
    expected: 'healthy',
✖ classify: a blocked meta with workers in flight reads blocked, not parked (0.322546ms)
  AssertionError [ERR_ASSERTION]: The input did not match the regular expression /is blocked/. Input:
    actual: 'meta-aio-w2 is parked with no live wait of its own: a settle wakes no one, so its verification is stranded. Probe it and re-arm its wait',
    expected: /is blocked/,
✖ readStatus: every owner of a worker's live waits is surfaced (92.438534ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
    actual: undefined,
    expected: [ 'orch-aio', 'meta-aio-w2' ],
✖ liveWaitFor: every live wait for a name is reported with its own owner (8.373945ms)
  TypeError: Cannot read properties of undefined (reading 'map')

=== RED: deterministic checks (runDeterministicChecks ./wake-liveness-without-owner) ===
# exit 1
all-waits-per-target-reported FAIL :: liveWaitFor waits=null owner_pane=w0:p1; readStatus owners=null owner=orch-x
no-contamination PASS :: no forbidden sources cited, no git command output
file-presence PASS :: test files present
open-wave-stranded-meta-not-healthy FAIL :: stranded=UNWATCHED retired=healthy verifying=healthy armedPark=UNWATCHED armedWorking=UNWATCHED shellPark=UNWATCHED unarmedPark=UNWATCHED (meta-x is parked with no live wait of its own: a settle wakes no one, so its verification is stranded. Probe it and re-arm its wait)
report-schema PASS :: newest recorded run JSON matches the record schema
status-note-names-owner FAIL :: unit suite failed:       at Test.postRun (node:internal/test_runner/test:1542:19) |       at Test.run (node:internal/test_runner/test:1467:12) |       at async Test.processPendingSubtests (node:internal/test_runner/test:974:7)
wait-owner-attributed PASS :: readProcessOwner reads HERDR_PANE_ID/HERDR_TAB_ID; liveWaitFor attaches owner_pane/owner_tab; an unreadable environ yields a null owner
```

## Green (fixed tool) + live probe
```
# Green run, incident 2026-10-28-c2d-omp-meta-own-waits (fixed src/status.mjs, src/wake.mjs, SKILL.md status-class sentence)
# Recorded 2026-10-28. The 2026-08-26 green run is kept in history/2026-08-26-fix-mechanical-proof-log.md.

=== GREEN: cd skills/catalyst-v2-dispatch && node --test test/status.test.mjs test/wake.test.mjs ===
# exit 0
ℹ tests 34
ℹ pass 34
ℹ fail 0
ℹ cancelled 0

=== GREEN: full dispatch suite (cd skills/catalyst-v2-dispatch && node --test) ===
# exit 0
ℹ tests 198
ℹ pass 198
ℹ fail 0
ℹ cancelled 0

=== GREEN: deterministic checks (runDeterministicChecks ./wake-liveness-without-owner) ===
# exit 0
all-waits-per-target-reported PASS :: liveWaitFor reports both live waits on impl-x with owner panes w0:p1 and w1:p1, first entry kept as owner_pane; readStatus gives wake.owners [orch-x, meta-x] with wake.owner orch-x
no-contamination PASS :: no forbidden sources cited, no git command output
file-presence PASS :: test files present
open-wave-stranded-meta-not-healthy PASS :: a settled-worker wave with a meta parked on a dead wake is UNWATCHED; a retired meta is a closed healthy wave; a verifying meta with a live wait is healthy; a parked or working meta that owns a live wait on an in-flight worker is healthy; a shell-parked meta is healthy; a parked meta whose workers only another agent watches is UNWATCHED, and no reason claims "no live wait of its own"
report-schema PASS :: newest recorded run JSON matches the record schema
status-note-names-owner PASS :: unit suite: 34 tests, 34 pass, 0 fail; status wake block carries owned_by_caller and the "not you" note, and no longer asserts bare coverage; SKILL.md no longer says a parked omp meta reads META QUIESCENT
wait-owner-attributed PASS :: readProcessOwner reads HERDR_PANE_ID/HERDR_TAB_ID; liveWaitFor attaches owner_pane/owner_tab; an unreadable environ yields a null owner

=== GREEN: incident reproduction (.tmp/inc-c2d-omp-waits/repro.mjs a..d) ===
== a
variant a
classify: healthy
reason  : every in-flight worker has a meta at work and a live wait running
wake_gaps: []
== b
variant b
classify: healthy
reason  : every in-flight worker has a meta at work and a live wait running
wake_gaps: []
== c
variant c
classify: healthy
reason  : every in-flight worker has a meta at work and a live wait running
wake_gaps: [ 'meta-aio-w2' ]
== d
variant d
classify: healthy
reason  : every in-flight worker has a meta at work and a live wait running
wake_gaps: []

=== LIVE all-waits proof (real herdr waits, 2026-10-28) ===
liveWaitFor(repair-c2d-meta-waits): {"running":true,"pid":273588,"ppid":273534,"orphaned":false,"scanned":true,"owner_pane":"w0:p1","owner_tab":"w0:t1","waits":[{"pid":273588,"ppid":273534,"owner_pane":"w0:p1","owner_tab":"w0:t1"},{"pid":275251,"ppid":272631,"owner_pane":"w0:pF","owner_tab":"w0:tF"}]}
```

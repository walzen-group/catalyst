# A healthy omp meta parked on its workers' waits reads UNWATCHED

**Status:** fixed and verified 2026-10-28. The repair spec is in the Fix
section, and its verification is recorded under Verification. Changes 1-4 are
in the working tree; nothing was committed.
**Filed:** 2026-10-28
**Store:** kit-level (catalyst system failure). The damage is the monitoring
read of wave 2026-10-28-catalyst-aio-w2 in /home/nixos/repos/catalyst-aio.
**Owning files:** skills/catalyst-v2-dispatch/src/status.mjs (classify:
stranded-meta rule and wake-gap filter; readStatus: wake ownership on each
entry), skills/catalyst-v2-dispatch/src/wake.mjs (liveWaitFor: one match
returned per name), plus their unit suites. The guarding test at
.cortex/.tests/catalyst/wake-liveness-without-owner/ already covers the
stranded rule and gets extended.
**Related records:** 2026-08-26-wake-liveness-without-owner introduced the
stranded rule this incident recurs on; 2026-08-04-orchestrator-self-wait names
the same category error for the caller's own pane; 2026-08-24-wake-churn-on-parked-meta,
2026-08-26-meta-orchestrator-wait-churn and 2026-08-26-wake-hold-idled-on-completed-work
record waits against a parked omp agent; 2026-09-06-wave2-conduct relied on a
status UNWATCHED read as real.

## Answer first

During wave 2026-10-28-catalyst-aio-w2, five workers ran and meta-aio-w2
monitored them with five live waits. `c2d status --dispatch-id` returned
UNWATCHED, claiming the meta was "parked with no live wait of its own".

The classifier asks whether a live `herdr agent wait meta-aio-w2` process
exists. The meta's waits run against its workers' names, and its own name has
none. A wait on a parked omp meta also returns at once, so no such process can
stay live. Every correctly armed omp meta parked between turns therefore reads
UNWATCHED.

Two more defects share the wrong subject. The wake-gap filter applies the same
own-name question to a working meta, and liveWaitFor returns one match per name,
so the meta's ownership disappears from every worker row when another agent also
waits on that worker.

## What the user wanted

User words, verbatim:

> ye fix the three kit issues please

This brief is one of the three. The observation, from orch-aio at 2026-10-28
about 15:37 to 15:40 local:

> c2d status --dispatch-id 2026-10-28-catalyst-aio-w2 returned classification
> UNWATCHED with reason "meta-aio-w2 is parked with no live wait of its own: a
> settle wakes no one, so its verification is stranded. Probe it and re-arm its
> wait", while all five workers were working.

Expected: the roster reads healthy when the meta owns live waits on every
worker.

## What went wrong

The wave ran five workers, all working, and meta-aio-w2 on omp
(opencode-go/deepseek-v4.1-flash, thinking max). The recorded dispatch result
at $XDG_STATE_HOME/catalyst-v2-dispatch/results/2026-10-28-catalyst-aio-w2.json
lists six agents: the five workers plus meta-aio-w2. The wake ledger prescribed
`herdr agent wait <name> --timeout 900000` for each.

A probe steer to the meta returned this content-bearing answer:

> Five: bg_1 aio-t2-core, bg_2 aio-t3-planning, bg_3 aio-t4-writing, bg_4
> aio-t5-memory, bg_5 aio-t6-readme, all harness background jobs of this
> session (proc:// shows them running, up 1m38s); the 'parked' read is my own
> roster entry between turns, and the worker waits c2d status attributes to
> orch-aio/w0:p1 are the orchestrator's own five, not mine.

Its screen showed background jobs with commands such as
`herdr agent wait aio-t6-readme --timeout 900000; echo "EXIT=$? ..."`. A later
status check returned UNWATCHED again. orch-aio also waited on the same five
workers with its own five background jobs.

The probe answer names a self-entry artifact. The tool never compares a roster
entry with the reader's identity to decide this verdict; `caller_self` only
excludes the reader's own entry from monitoring. The verdict came from a
different question, described next.

## Mechanism

### An entry's wake is a wait on that agent

For each target, readStatus calls `liveWaitFor(name)` and puts its result in the
entry's wake block. For the meta entry, that asks whether a live process
`herdr agent wait meta-aio-w2` exists, which is the caller's coverage of the
meta. The role discipline arms waits on workers, and the orchestrator wakes on
the meta's hand-back push. wake.mjs records the measured fact that a wait on an
already settled agent returns at once with exit 0, so a wait on a parked omp
meta exits in milliseconds and leaves no process behind.

### Stranded fires on every settled meta

status.mjs, classify:

```js
const stranded = openMetas.filter((meta) => meta.status !== 'working'
  && meta.wake !== undefined && meta.wake !== null && meta.wake.running === false);
if (stranded.length > 0) {
  return {
    classification: 'UNWATCHED',
    reason: `${stranded.map((meta) => meta.name).join(', ')} is parked with no live wait of its own: a settle wakes no one, so its verification is stranded. Probe it and re-arm its wait`,
  };
}
```

A settled meta's own-name wake is false by construction, so the filter selects
every parked meta. It also selects a meta parked on background shells, which
those shells will resume.

### Wake-gap filter repeats the wrong subject

Later in classify:

```js
const gaps = agents.filter(wakeMissing).map((agent) => agent.name);
```

wakeMissing asks whether the entry is still working and has no live wait. Applied
to a meta, it flags a meta in its own turn with no wait on its own name. The
meta's waits on its workers, which will wake it on a settle, do not enter the
question.

### One match per name hides the meta's ownership

liveWaitFor returns the first non-orphan `herdr agent wait <name>` match in ps
order. With orch-aio's wait and the meta's wait on the same worker, the worker
row reports orch-aio as owner and the meta's wait is absent from the status
document. The 2026-08-26 fix added owner attribution, but only for the one match
it returns.

### Reproduction

The scratch directory /etc/nixos/nix/catalyst/.tmp/inc-c2d-omp-waits/ contains the
reproduction. It copies the recorded dispatch result and wake records, then runs
the live status.mjs with an injected roster, process table, and process
environments:

```bash
cd /etc/nixos/nix/catalyst/.tmp/inc-c2d-omp-waits && node repro.mjs a
```

The process table for variant a has two live waits per worker, one owned by
orch-aio (HERDR_PANE_ID=w0:p1) and one by meta-aio-w2 (HERDR_PANE_ID=w1:p1),
with the orchestrator's first. The live process table is gone; the roster and
pids are reconstructed from the observed read, while the dispatch document and
wake records are the recorded originals. The verdict and reason match the
observation exactly.

| Variant | Shape | Result |
|---|---|---|
| a | meta idle, five workers working, two waits per worker, none on the meta | UNWATCHED, reason byte-identical to the observed one; meta wake running false; each worker reports owner orch-aio |
| b | variant a plus one live wait on meta-aio-w2 | META QUIESCENT, never healthy |
| c | meta working in its own turn, armed on all five workers, no wait on its own name | UNWATCHED, "a meta is at work, but no live wait is running for meta-aio-w2" |
| d | meta idle, only the meta's five waits (no orchestrator waits) | UNWATCHED, while every worker row correctly reports owner meta-aio-w2 |

Variant d isolates the meta-row check: even when the worker rows name the meta
as owner, classify never reads them for the meta. Variant b shows the expected
reading has no path even in the one shape the current rule calls watched.

## Recurrence scan

All wake-subsystem incidents were read before filing: 2026-08-01-dispatch-wake-armed-nothing-delivers,
2026-08-01-steer-arms-no-settle-wake, 2026-08-04-orchestrator-self-wait,
2026-08-03-meta-retirement-misdiagnosis, 2026-08-24-wake-churn-on-parked-meta,
2026-08-26-wake-liveness-without-owner, 2026-08-26-meta-orchestrator-wait-churn,
2026-08-26-wake-hold-idled-on-completed-work, 2026-09-06-wave2-conduct,
2026-08-02-status-misclassified-worker-as-meta.

No prior incident records this verdict on a healthy wave. It is a recurrence of
the rule introduced by 2026-08-26-wake-liveness-without-owner. That incident's
second stall was a meta that read the orchestrator's wait on its worker as its
own coverage and armed nothing, so the fix added owner attribution and a
stranded-meta verdict for a meta whose own wake was dead. The fix then defined
the meta's watchfulness as a wait on the meta's own name. That name is the
caller's coverage obligation, never the meta's reachability. The earlier fix did
not take, and its premise is the root cause here.

That incident also left an open item: a worker counts as covered by any live
wait, whichever agent owns it. This incident exposed the mirror fact, which the
owner data it added can already answer: a meta is watched when it owns waits,
and the only waits that can wake it are the ones it owns on workers still in
flight.

## Root cause

status.mjs models a meta's watchfulness as a live wait on the meta's own name.
The role-prescribed waits run on the workers' names, so an armed omp meta
parked between turns reads UNWATCHED. The same own-name question in the
wake-gap filter flags a meta in its own turn, and liveWaitFor's first-match
return erases the meta's ownership from worker rows whenever another agent
waits on the same worker.

Owning files: skills/catalyst-v2-dispatch/src/status.mjs (classify,
readStatus) and skills/catalyst-v2-dispatch/src/wake.mjs (liveWaitFor).

## Fix

Tool code, in progress. Per this dispatch's brief, the c2d code is not written
here; the repair wave implements it and owns verification. The changes below are
the repair spec.

### Change 1: liveWaitFor reports every live wait with its owner

File: skills/catalyst-v2-dispatch/src/wake.mjs.

Keep the argv rules exactly as they are: argv[0] basename herdr, argv[1] agent,
argv[2] wait, argv[3] the exact name, own pid skipped. Scan the whole ps table
and do not return at the first non-orphan match.

Return shape:

| Field | Meaning |
|---|---|
| waits | Every live non-orphan match: { pid, ppid, owner_pane, owner_tab }. Empty when only an orphan exists or nothing matches. |
| running | waits.length > 0. |
| pid, ppid, owner_pane, owner_tab | The first entry of waits, for backward compatibility; null when waits is empty. |
| orphaned | True only when waits is empty and an orphan match exists (today's orphan fallback). |
| scanned | Unchanged. |

`owner_pane` and `owner_tab` on each entry come from readProcessOwner on that
pid. An environ that cannot be read leaves that entry's owner fields null and
never removes the entry.

### Change 2: readStatus exposes every owner of an agent's waits

File: skills/catalyst-v2-dispatch/src/status.mjs.

In the entry construction, map each wait's owner_pane through rosterByPane and
set `wake.owners` to the unique owning agent names, in wait order. Keep
`wake.owner` as the first name, `wake.owner_pane` as the first pane, and
`owned_by_caller` as today. The caller_self block gets `owners: []`.

### Change 3: classify reads the waits a meta owns on workers in flight

File: skills/catalyst-v2-dispatch/src/status.mjs.

Add two helpers:

```js
function ownersOf(agent) {
  if (Array.isArray(agent.wake?.owners)) return agent.wake.owners;
  return agent.wake?.owner ? [agent.wake.owner] : [];
}

// A settled meta is armed when it owns a live wait on a worker still in flight:
// that worker's settle wakes it. A wait on the meta's own name is the caller's
// coverage, never the meta's reachability.
function armedOnWorkers(meta, agents) {
  return agents.some((agent) => agent.role === 'worker'
    && stillWorking(agent)
    && ownersOf(agent).includes(meta.name));
}
```

Change the stranded filter so it selects a meta that owns no live wake
mechanism: not working, not blocked, not parked on background shells, and not
armed on workers in flight. Keep the existing presence guard on `wake` so a
hand-built roster with no wake reading is not read as a gap.

```js
const stranded = openMetas.filter((meta) => meta.parked_monitoring !== true
  && meta.status !== 'working' && meta.status !== 'blocked'
  && meta.wake !== undefined && meta.wake !== null
  && !armedOnWorkers(meta, agents));
```

Rewrite the reason so it states the repair, for example:
`${names} is settled with no live wait it owns on a worker still in flight:
nothing will wake it when that work settles, so its verification is stranded.
Probe it and re-arm its wait on the workers it monitors`
The phrase "no live wait of its own" goes; it is the false claim this incident
removes.

Add an armed park to the at-work set:

```js
const atWork = metas.filter((meta) => meta.status === 'working'
  || meta.parked_monitoring === true
  || armedOnWorkers(meta, agents));
```

Change the gap filter from `agents.filter(wakeMissing)` to
`workers.filter(wakeMissing)`. A meta is not a wake gap; the waits it owns on
workers, and the worker rows' own gaps, carry that reading. The blocked branch
becomes reachable for a blocked meta, which is the reason string a caller can
act on.

### Change 4: sync the status-class sentence

File: skills/catalyst-v2-dispatch/SKILL.md, the paragraph beginning "A settled
agent is not a finished one".

The sentence "META QUIESCENT is a settled meta whose session is still live: an
omp meta between turns reads this way" stops being true for live reads. A
settled meta with a wake reading now reads healthy when it owns a live wait on a
worker in flight, and UNWATCHED when it owns none. META QUIESCENT remains for a
roster with no wake reading. This file is already modified by the
opus-5-5 rename wave; edit around those changes and never revert them.

### Test-first order

Per catalyst-v2-sdd-rules, write the tests first and record the failing run
before touching src.

Step 1. Add to skills/catalyst-v2-dispatch/test/status.test.mjs:

```js
test('classify: a parked meta that owns live waits on in-flight workers is healthy, not stranded', () => {
  const result = classify([
    { name: 'aio-t2-core', role: 'worker', status: 'working', wake: { running: true, owner: 'orch-aio', owners: ['orch-aio', 'meta-aio-w2'] } },
    { name: 'meta-aio-w2', role: 'meta', status: 'idle', present: true, tokens_spent: true, parked_monitoring: false, wake: { running: false, owners: [] } },
  ]);
  assert.equal(result.classification, 'healthy');
  assert.match(result.reason, /live wait/);
});

test('classify: a working meta is not a wake gap when its waits are on the workers', () => {
  const result = classify([
    { name: 'aio-t2-core', role: 'worker', status: 'working', wake: { running: true, owners: ['meta-aio-w2'] } },
    { name: 'meta-aio-w2', role: 'meta', status: 'working', present: true, tokens_spent: true, wake: { running: false, owners: [] } },
  ]);
  assert.equal(result.classification, 'healthy');
});

test('classify: a settled meta parked on background shells is not stranded', () => {
  const result = classify([
    { name: 'aio-t2-core', role: 'worker', status: 'working', wake: { running: true, owners: ['orch-aio'] } },
    { name: 'meta-aio-w2', role: 'meta', status: 'done', present: true, tokens_spent: true, parked_monitoring: true, wake: { running: false, owners: [] } },
  ]);
  assert.equal(result.classification, 'healthy');
});

test('classify: a parked meta whose workers are watched only by another agent is stranded', () => {
  const result = classify([
    { name: 'aio-t2-core', role: 'worker', status: 'working', wake: { running: true, owner: 'orch-aio', owners: ['orch-aio'] } },
    { name: 'meta-aio-w2', role: 'meta', status: 'idle', present: true, tokens_spent: true, wake: { running: false, owners: [] } },
  ]);
  assert.equal(result.classification, 'UNWATCHED');
  assert.match(result.reason, /meta-aio-w2/);
});

test('classify: a blocked meta with workers in flight reads blocked, not parked', () => {
  const result = classify([
    { name: 'aio-t2-core', role: 'worker', status: 'working', wake: { running: true, owners: ['orch-aio'] } },
    { name: 'meta-aio-w2', role: 'meta', status: 'blocked', present: true, tokens_spent: true, wake: { running: false, owners: [] } },
  ]);
  assert.equal(result.classification, 'UNWATCHED');
  assert.match(result.reason, /is blocked/);
});
```

Add to skills/catalyst-v2-dispatch/test/wake.test.mjs, reusing its fakePs helper:

```js
test('liveWaitFor: every live wait for a name is reported with its own owner', () => {
  const environ = (pid) => (pid === 4243
    ? ['HERDR_PANE_ID=w0:p1', 'HERDR_TAB_ID=w0:t1'].join('\0')
    : ['HERDR_PANE_ID=w1:p1', 'HERDR_TAB_ID=w1:t1'].join('\0'));
  const found = liveWaitFor('impl-aio', {
    psBin: fakePs([
      '  4243  9001 herdr agent wait impl-aio --timeout 900000',
      '  4244  9002 herdr agent wait impl-aio --timeout 900000',
    ]),
    readEnviron: environ,
  });
  assert.equal(found.running, true);
  assert.deepEqual(found.waits.map((wait) => wait.owner_pane).sort(), ['w0:p1', 'w1:p1']);
  assert.equal(found.owner_pane, 'w0:p1');
});
```

Add to status.test.mjs, with the rig helper already imported:

```js
test("readStatus: every owner of a worker's live waits is surfaced", () => {
  const r = rig({
    agentList: rosterReply([
      { name: 'orch-aio', agent: 'omp', agent_status: 'working', tab_id: 'w0:t1', pane_id: 'w0:p1', cwd: '/repo', tokens: { input: 10 } },
      { name: 'meta-aio-w2', agent: 'omp', agent_status: 'idle', tab_id: 'w1:t1', pane_id: 'w1:p1', cwd: '/repo', tokens: { input: 10 } },
      { name: 'aio-t2-core', agent: 'omp', agent_status: 'working', tab_id: 'w2:t1', pane_id: 'w2:p1', cwd: '/repo', tokens: { input: 10 } },
    ]),
    psLines: [
      '  1000  999 herdr agent wait aio-t2-core --timeout 900000',
      '  1001  998 herdr agent wait aio-t2-core --timeout 900000',
    ],
    environByPid: {
      1000: ['HERDR_PANE_ID=w0:p1', 'HERDR_TAB_ID=w0:t1'].join('\0'),
      1001: ['HERDR_PANE_ID=w1:p1', 'HERDR_TAB_ID=w1:t1'].join('\0'),
    },
  });
  const env = { ...r.env, HERDR_PANE_ID: 'w3:p1', HERDR_TAB_ID: 'w3:t1' };
  const out = readStatus({ names: ['aio-t2-core'], env, options: r.options });
  const worker = out.agents.find((agent) => agent.name === 'aio-t2-core');
  assert.deepEqual(worker.wake.owners, ['orch-aio', 'meta-aio-w2']);
  assert.equal(worker.wake.owner, 'orch-aio');
});
```

Step 2. Run the new tests against the unfixed source and record the failing
output in .cortex/.tests/catalyst/wake-liveness-without-owner/red-run.txt:

```bash
cd /etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch && node --test test/status.test.mjs test/wake.test.mjs
```

Expected red: the armed-park, working-meta, shell-park, and blocked tests return
the wrong verdict or reason; the liveWaitFor multi-wait test throws on
`found.waits`; the readStatus owners test finds no owners array. Record the
output before any src edit.

Step 3. Implement Changes 1 through 4.

Step 4. Run the green commands and record green-run.txt.

### Guarding test

Scan result: .cortex/.tests/catalyst/wake-liveness-without-owner/ already guards
classify's stranded rule, so extend it; do not create a second test.

| File | Change |
|---|---|
| checks.mjs | Extend openWaveStrandedMetaNotHealthy with the armed parked meta case, the working armed meta case, and the shell-parked meta case; keep the wave-close stranded case, retired meta, and verifying meta. Add an all-waits-per-target-reported check: two waits with two owner panes on one name give both owners through liveWaitFor and through readStatus's wake.owners. In statusNoteNamesOwner, add a source check that the dispatch skill no longer states a parked omp meta reads META QUIESCENT. |
| test.yaml | Add the new criterion id and update the stranded criterion text. Add skills/catalyst-v2-dispatch/SKILL.md to covered_files so the status-class sync is guarded with the tool. |
| red-run.txt, green-run.txt | Record the check run before and after the fix. |
| history/2026-10-28-fix-live-proof.{json,md,-log.md} | Transcribed mechanical run, following history/2026-08-26-fix-mechanical-proof.json: no actor launch, no-contamination unverified, criteria details carrying the red and green evidence. |
| README.md | Update the last-result cell for wake-liveness-without-owner. Re-read the file immediately before editing; sibling metas may touch it. |

### Acceptance commands

```bash
cd /etc/nixos/nix/catalyst/skills/catalyst-v2-dispatch && node --test
```

Expected result: every test passes, including the new cases, with no
regressions. Record the tests/pass/fail counts.

```bash
cd /etc/nixos/nix/catalyst/.cortex/.tests/catalyst && node --input-type=module -e "
const { runDeterministicChecks } = await import('./lib/deterministic.mjs');
const dir = './wake-liveness-without-owner';
const results = await runDeterministicChecks(dir, { testDir: dir, actorReport: '', transcript: '', coveredFiles: [], isolation: [], spec: {} });
for (const r of results) console.log(r.criterion, r.pass ? 'PASS' : 'FAIL', '::', r.detail);
if (results.some((r) => !r.pass)) process.exitCode = 1;
"
```

Expected result: every deterministic criterion passes, including
all-waits-per-target-reported and the extended stranded criterion.

Optional live proof, matching the 2026-08-26 precedent: run the shipped
liveWaitFor against a real live wait process and show its owner pane. The fake ps
and environ tests exercise the same path deterministically.

### Verification owner

The meta-agent of the repair wave that orch-aio dispatches. It runs the red and
green steps, records both runs, and reports the suite counts and the extended
guarding-test result in its hand-back. This incident's verification is not owed
to the orchestrator.

## Verification

Verified 2026-10-28 by meta-repair-c2d-waits, the repair wave's meta-agent, with
worker repair-c2d-meta-waits (claude-opus-5-5) implementing Changes 1-4.

### Test-first order holds

The red run was recorded before any source edit. Timestamps: red artifacts
`.tmp/repair-c2d-meta-waits/red-unit.txt` and `red-checks.txt` written 16:07:53;
`src/wake.mjs` edited 16:08:34 and `src/status.mjs` 16:08:59. A tree snapshot
taken at 16:08:02 hashed both source files byte-identical to their `HEAD` blobs,
so the red run exercised unfixed source. Red, recorded verbatim in
`.cortex/.tests/catalyst/wake-liveness-without-owner/red-run.txt`: `node --test
test/status.test.mjs test/wake.test.mjs` exit 1, 34 tests, 28 pass, 6 fail (the
armed-park, working-meta and shell-park classify tests read UNWATCHED, the
blocked test got the stranded reason, `wake.owners` was undefined, and
`found.waits` threw); the deterministic checks exited 1 with
all-waits-per-target-reported, open-wave-stranded-meta-not-healthy and
status-note-names-owner FAIL. Green: same two-file run 34/34, exit 0.

### Acceptance, run by the verification owner

| Command | Result |
|---|---|
| `cd skills/catalyst-v2-dispatch && node --test` | exit 0, 198 tests, 198 pass, 0 fail |
| `runDeterministicChecks ./wake-liveness-without-owner` | exit 0, 7/7 PASS |
| `node repro.mjs a`, `b`, `c`, `d` | every variant reads `healthy`, reason "every in-flight worker has a meta at work and a live wait running" |
| live `liveWaitFor('meta-inc-model-id-spelling')` with two real waits (orch-aio and this meta's own probe) | `waits` carries both, owner panes `w0:p1` and `w0:pF`, top-level fields mirror the first |
| live `readStatus({})` on that roster | that entry's `wake.owners` is `["orch-aio","meta-repair-c2d-waits"]` |

The original symptom is gone: variants a-d all read healthy, where pre-fix a,
c and d were UNWATCHED and b was META QUIESCENT. Variant d is the clean one:
every worker row names the meta as owner and classify reads it armed.

### Diff against the Fix section

Changes 1-4 are present as specified and nothing else in the source moved:
`liveWaitFor` scans the whole table, returns `waits` with per-entry owners, and
keeps first-match top-level fields with `orphaned` only when `waits` is empty;
`readStatus` maps each wait's pane to a roster name into `wake.owners`, keeps
`wake.owner`/`owner_pane`/`owned_by_caller`, and the caller block has `owners:
[]`; `classify` adds `ownersOf`/`armedOnWorkers`, narrows stranded with the
parked/working/blocked guards, admits an armed park to `atWork`, and gaps only
over workers; the SKILL.md status-class paragraph no longer says a parked omp
meta reads META QUIESCENT and keeps the sibling waves' edits. The worker wrote
only the incident's named files (plus `.tmp/repair-c2d-meta-waits/` scratch);
nothing was staged or committed, HEAD stayed `a00dd80`.

### Guarding test

`wake-liveness-without-owner` was extended as planned: checks.mjs gains the
armed-park, working-armed, shell-park and unarmed-park cases in
open-wave-stranded-meta-not-healthy, a new all-waits-per-target-reported check,
and the SKILL.md source check in status-note-names-owner; test.yaml adds the new
criterion id, the reworded stranded text, and SKILL.md to `covered_files`. The
extended test's first recorded run is
`history/2026-10-28-fix-live-proof.{json,md,-log.md}`, a transcribed mechanical
run per the 2026-08-26 precedent (deterministic-only test: no actor or judge
launch; no-contamination left unverified). Its criteria all pass and its red
half is transcribed from the recorded red run.

## What stays open

Partial coverage stays out of this fix. A meta that owns a wait on one in-flight
worker and none on another will read healthy once the change lands, because the
armed check accepts one owned wait. Requiring every in-flight worker to be
covered by its meta's wait is the topology-aware verdict left open by
2026-08-26-wake-liveness-without-owner, and this change does not widen to it.

A wave-close read can still catch the last worker's settle after the meta's wait
exits and before the meta's next turn starts; it reads UNWATCHED and the probe
clears it. That behavior predates this incident and is unchanged.

A names-scoped read that leaves the workers out, such as `--agents meta-aio-w2`
on its own, cannot see the owners recorded on worker entries, so a healthy meta
read that way still shows stranded. The dispatch scope and the full-roster read
include the workers, and the incident and its acceptance exercise those scopes.

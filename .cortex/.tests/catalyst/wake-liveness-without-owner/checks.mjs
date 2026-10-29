// Deterministic checks for the wake-liveness-without-owner test. Each exported
// function receives the run context { testDir, actorReport, transcript,
// coveredFiles, isolation, spec } and returns { criterion, pass, detail }. The
// criterion string must match a deterministic criterion id in test.yaml. Zero
// runtime deps, Node ESM.
//
// The guarded artifact is the c2d dispatch tool (wake.mjs, status.mjs). These
// checks exercise the live tool source directly: import its functions with
// injected fakes for the functional rules, and run the tool's own unit suite as
// the backstop.

import { existsSync, readFileSync, readdirSync, chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// The dispatch tool under guard, resolved from the test dir: kit root is four up
// (<slug>/ -> catalyst/ -> .tests/ -> .cortex/ -> kit root).
function dispatchDir(testDir) {
  return join(testDir, '..', '..', '..', '..', 'skills', 'catalyst-v2-dispatch');
}

async function loadWake(testDir) {
  return import(pathToFileURL(join(dispatchDir(testDir), 'src', 'wake.mjs')).href);
}
async function loadStatus(testDir) {
  return import(pathToFileURL(join(dispatchDir(testDir), 'src', 'status.mjs')).href);
}

/** A stand-in `ps -eo pid=,ppid=,args=` printing the supplied fixture lines. */
function fakePs(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'wlwo-ps-'));
  const bin = join(dir, 'ps');
  writeFileSync(bin, `#!/bin/sh\ncat <<'EOF'\n${lines.join('\n')}\nEOF\n`);
  chmodSync(bin, 0o755);
  return bin;
}

// wait-owner-attributed: readProcessOwner parses the owner from a process
// environ, and liveWaitFor attaches it to a found wait, so a wait owned by
// another pane is attributable as not-the-reader's.
export async function waitOwnerAttributed(ctx) {
  try {
    const { readProcessOwner, liveWaitFor } = await loadWake(ctx.testDir);
    const environ = ['HERDR_ENV=1', 'HERDR_PANE_ID=w7:p1', 'HERDR_TAB_ID=w7:t1', 'PATH=/usr/bin'].join('\0');
    const owner = readProcessOwner(4243, { readEnviron: () => environ });
    const wait = liveWaitFor('delegate-a', {
      psBin: fakePs(['  4243  9001 herdr agent wait delegate-a --timeout 900000']),
      readEnviron: () => environ,
    });
    const nullOwner = readProcessOwner(4243, { readEnviron: () => null });
    const ok = owner.pane === 'w7:p1' && owner.tab === 'w7:t1'
      && wait.running === true && wait.orphaned === false
      && wait.owner_pane === 'w7:p1' && wait.owner_tab === 'w7:t1'
      && nullOwner.pane === null;
    return {
      criterion: 'wait-owner-attributed',
      pass: ok,
      detail: ok
        ? 'readProcessOwner reads HERDR_PANE_ID/HERDR_TAB_ID; liveWaitFor attaches owner_pane/owner_tab; an unreadable environ yields a null owner'
        : `owner=${JSON.stringify(owner)} wait.owner_pane=${wait.owner_pane} nullOwner=${JSON.stringify(nullOwner)}`,
    };
  } catch (error) {
    return { criterion: 'wait-owner-attributed', pass: false, detail: `threw: ${error.message}` };
  }
}

// open-wave-stranded-meta-not-healthy: classify() surfaces a stranded meta after
// its worker settled instead of reading the wave healthy.
export async function openWaveStrandedMetaNotHealthy(ctx) {
  try {
    const { classify } = await loadStatus(ctx.testDir);
    const stranded = classify([
      { name: 'impl-x', role: 'worker', status: 'idle' },
      { name: 'meta-x', role: 'meta', status: 'idle', present: true, tokens_spent: true, parked_monitoring: false, wake: { running: false } },
    ]);
    const retired = classify([
      { name: 'impl-x', role: 'worker', status: 'idle' },
      { name: 'meta-x', role: 'meta', status: 'exited', present: true },
    ]);
    const verifying = classify([
      { name: 'impl-x', role: 'worker', status: 'idle' },
      { name: 'meta-x', role: 'meta', status: 'working', present: true, wake: { running: true } },
    ]);
    // A meta's waits run on its workers' names, so a dead wait on the meta's own
    // name is the caller's gap, never the meta's (incident
    // 2026-10-28-c2d-omp-meta-own-waits).
    const armedPark = classify([
      { name: 'impl-x', role: 'worker', status: 'working', wake: { running: true, owner: 'orch-x', owners: ['orch-x', 'meta-x'] } },
      { name: 'meta-x', role: 'meta', status: 'idle', present: true, tokens_spent: true, parked_monitoring: false, wake: { running: false, owners: [] } },
    ]);
    const armedWorking = classify([
      { name: 'impl-x', role: 'worker', status: 'working', wake: { running: true, owners: ['meta-x'] } },
      { name: 'meta-x', role: 'meta', status: 'working', present: true, tokens_spent: true, wake: { running: false, owners: [] } },
    ]);
    const shellPark = classify([
      { name: 'impl-x', role: 'worker', status: 'working', wake: { running: true, owners: ['orch-x'] } },
      { name: 'meta-x', role: 'meta', status: 'done', present: true, tokens_spent: true, parked_monitoring: true, wake: { running: false, owners: [] } },
    ]);
    const unarmedPark = classify([
      { name: 'impl-x', role: 'worker', status: 'working', wake: { running: true, owner: 'orch-x', owners: ['orch-x'] } },
      { name: 'meta-x', role: 'meta', status: 'idle', present: true, tokens_spent: true, wake: { running: false, owners: [] } },
    ]);
    const ok = stranded.classification === 'UNWATCHED' && /meta-x/.test(stranded.reason)
      && retired.classification === 'healthy'
      && verifying.classification === 'healthy'
      && armedPark.classification === 'healthy'
      && armedWorking.classification === 'healthy'
      && shellPark.classification === 'healthy'
      && unarmedPark.classification === 'UNWATCHED' && /meta-x/.test(unarmedPark.reason)
      && !/no live wait of its own/.test(`${stranded.reason} ${unarmedPark.reason}`);
    return {
      criterion: 'open-wave-stranded-meta-not-healthy',
      pass: ok,
      detail: ok
        ? 'a settled-worker wave with a meta parked on a dead wake is UNWATCHED; a retired meta is a closed healthy wave; a verifying meta with a live wait is healthy; a parked or working meta that owns a live wait on an in-flight worker is healthy; a shell-parked meta is healthy; a parked meta whose workers only another agent watches is UNWATCHED, and no reason claims "no live wait of its own"'
        : `stranded=${stranded.classification} retired=${retired.classification} verifying=${verifying.classification} armedPark=${armedPark.classification} armedWorking=${armedWorking.classification} shellPark=${shellPark.classification} unarmedPark=${unarmedPark.classification} (${unarmedPark.reason})`,
    };
  } catch (error) {
    return { criterion: 'open-wave-stranded-meta-not-healthy', pass: false, detail: `threw: ${error.message}` };
  }
}

// all-waits-per-target-reported: two live waits on one name, owned by two panes,
// give both owners through liveWaitFor and through readStatus's wake.owners. A
// first-match return erased a meta's ownership whenever the orchestrator also
// waited on the same worker (incident 2026-10-28-c2d-omp-meta-own-waits).
export async function allWaitsPerTargetReported(ctx) {
  try {
    const { liveWaitFor } = await loadWake(ctx.testDir);
    const { readStatus } = await loadStatus(ctx.testDir);
    const { rig } = await import(pathToFileURL(join(dispatchDir(ctx.testDir), 'test', 'helpers', 'harness.mjs')).href);
    const psLines = [
      '  1000  999 herdr agent wait impl-x --timeout 900000',
      '  1001  998 herdr agent wait impl-x --timeout 900000',
    ];
    const environByPid = {
      1000: ['HERDR_PANE_ID=w0:p1', 'HERDR_TAB_ID=w0:t1'].join('\0'),
      1001: ['HERDR_PANE_ID=w1:p1', 'HERDR_TAB_ID=w1:t1'].join('\0'),
    };
    const found = liveWaitFor('impl-x', {
      psBin: fakePs(psLines),
      readEnviron: (pid) => environByPid[pid] ?? null,
    });
    const wakePanes = Array.isArray(found.waits) ? found.waits.map((wait) => wait.owner_pane).sort() : null;
    const agents = [
      { name: 'orch-x', agent: 'omp', agent_status: 'working', tab_id: 'w0:t1', pane_id: 'w0:p1', cwd: '/repo', tokens: { input: 10 } },
      { name: 'meta-x', agent: 'omp', agent_status: 'idle', tab_id: 'w1:t1', pane_id: 'w1:p1', cwd: '/repo', tokens: { input: 10 } },
      { name: 'impl-x', agent: 'omp', agent_status: 'working', tab_id: 'w2:t1', pane_id: 'w2:p1', cwd: '/repo', tokens: { input: 10 } },
    ];
    const r = rig({
      agentList: { status: 0, stdout: `${JSON.stringify({ id: 'cli:agent:list', result: { agents } })}\n` },
      psLines,
      environByPid,
    });
    const env = { ...r.env, HERDR_PANE_ID: 'w3:p1', HERDR_TAB_ID: 'w3:t1' };
    const out = readStatus({ names: ['impl-x'], env, options: r.options });
    const worker = out.agents.find((agent) => agent.name === 'impl-x');
    const owners = worker?.wake?.owners ?? null;
    const ok = found.running === true && found.owner_pane === 'w0:p1'
      && JSON.stringify(wakePanes) === JSON.stringify(['w0:p1', 'w1:p1'])
      && JSON.stringify(owners) === JSON.stringify(['orch-x', 'meta-x'])
      && worker.wake.owner === 'orch-x';
    return {
      criterion: 'all-waits-per-target-reported',
      pass: ok,
      detail: ok
        ? 'liveWaitFor reports both live waits on impl-x with owner panes w0:p1 and w1:p1, first entry kept as owner_pane; readStatus gives wake.owners [orch-x, meta-x] with wake.owner orch-x'
        : `liveWaitFor waits=${JSON.stringify(wakePanes)} owner_pane=${found.owner_pane}; readStatus owners=${JSON.stringify(owners)} owner=${worker?.wake?.owner}`,
    };
  } catch (error) {
    return { criterion: 'all-waits-per-target-reported', pass: false, detail: `threw: ${error.message}` };
  }
}

// status-note-names-owner: the dispatch tool's own unit suite passes (the
// functional proof of the owner-aware note and the wave rule), and the status
// source no longer carries the bare-coverage note that misled a meta.
export function statusNoteNamesOwner(ctx) {
  const dir = dispatchDir(ctx.testDir);
  let suiteOk = false;
  let suiteDetail = '';
  try {
    const out = execFileSync('node', ['--test', 'test/wake.test.mjs', 'test/status.test.mjs'], { cwd: dir, encoding: 'utf8' });
    const tests = Number(/tests (\d+)/.exec(out)?.[1] ?? NaN);
    const pass = Number(/pass (\d+)/.exec(out)?.[1] ?? NaN);
    const fail = Number(/fail (\d+)/.exec(out)?.[1] ?? NaN);
    suiteOk = Number.isFinite(fail) && fail === 0 && pass === tests && tests > 0;
    suiteDetail = `unit suite: ${tests} tests, ${pass} pass, ${fail} fail`;
  } catch (error) {
    const tail = (error?.stdout ? String(error.stdout) : '').split('\n').filter(Boolean).slice(-3).join(' | ');
    return { criterion: 'status-note-names-owner', pass: false, detail: `unit suite failed: ${tail || error.message}` };
  }
  const status = readFileSync(join(dir, 'src', 'status.mjs'), 'utf8');
  const hasOwnerNote = /owned_by_caller/.test(status) && /it wakes ITS owner, not you/.test(status);
  const dropsBareCoverage = !/and its owner will be woken/.test(status);
  // The status-class paragraph in the dispatch skill must not tell a reader that
  // a parked omp meta reads META QUIESCENT: with a wake reading it reads healthy
  // when armed on its workers (incident 2026-10-28-c2d-omp-meta-own-waits).
  const skill = readFileSync(join(dir, 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');
  const skillSynced = !/META QUIESCENT is a settled meta whose session is still live: an omp meta between turns reads this way/.test(skill);
  const ok = suiteOk && hasOwnerNote && dropsBareCoverage && skillSynced;
  return {
    criterion: 'status-note-names-owner',
    pass: ok,
    detail: ok
      ? `${suiteDetail}; status wake block carries owned_by_caller and the "not you" note, and no longer asserts bare coverage; SKILL.md no longer says a parked omp meta reads META QUIESCENT`
      : `${suiteDetail}; ownerNote=${hasOwnerNote} dropsBareCoverage=${dropsBareCoverage} skillSynced=${skillSynced}`,
  };
}

// Forbidden sources: the incident report, the fix dispatch, and this test's own
// history. The tool's own field names (owner_pane, owned_by_caller) are the
// guarded behavior, not a dispatch marker, so quoting them is never a hit.
const FORBIDDEN_SOURCES =
  /2026-08-26-wake-liveness-without-owner|wake-liveness-without-owner\/history\//;
const GIT_OUTPUT = /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const match = FORBIDDEN_SOURCES.exec(text);
  const gitOut = GIT_OUTPUT.exec(text);
  return {
    criterion: 'no-contamination',
    pass: match === null && gitOut === null,
    detail: match === null && gitOut === null
      ? 'no forbidden sources cited, no git command output'
      : `cites forbidden source: ${match ? match[0] : gitOut[0]}`,
  };
}

// The recorded run JSON carries the runner's record schema. Validates the newest
// recorded run (the transcribed baseline on the first run).
export function reportSchema(ctx) {
  const problems = [];
  const historyDir = join(ctx.testDir, 'history');
  let jsonPath = null;
  if (existsSync(historyDir)) {
    const files = readdirSync(historyDir).filter((name) => name.endsWith('.json')).sort();
    if (files.length > 0) jsonPath = join(historyDir, files[files.length - 1]);
  }
  if (!jsonPath) {
    problems.push('no recorded run JSON in history/');
  } else {
    let record = null;
    try {
      record = JSON.parse(readFileSync(jsonPath, 'utf8'));
    } catch {
      problems.push('newest run JSON does not parse');
    }
    if (record) {
      const criteriaOk = Array.isArray(record.criteria) && record.criteria.length > 0
        && record.criteria.every((c) => typeof c.id === 'string' && typeof c.status === 'string');
      if (!criteriaOk) problems.push('criteria missing or entries lack id/status');
      if (!record.models_used || typeof record.models_used.actor !== 'string'
        || typeof record.models_used.judge !== 'string') {
        problems.push('models_used.actor or models_used.judge missing');
      }
      if (typeof record.duration_ms !== 'number') problems.push('duration_ms missing');
    }
  }
  return {
    criterion: 'report-schema',
    pass: problems.length === 0,
    detail: problems.length === 0 ? 'newest recorded run JSON matches the record schema' : problems.join('; '),
  };
}

export function filePresence(ctx) {
  const missing = ['test.yaml', 'scenario.md', 'checks.mjs']
    .filter((name) => !existsSync(join(ctx.testDir, name)));
  const historyDir = join(ctx.testDir, 'history');
  const emptyHistory = !existsSync(historyDir)
    || readdirSync(historyDir).filter((name) => name.endsWith('.json')).length === 0;
  if (emptyHistory) missing.push('history/ (non-empty)');
  return {
    criterion: 'file-presence',
    pass: missing.length === 0,
    detail: missing.length === 0 ? 'test files present' : `missing: ${missing.join(', ')}`,
  };
}

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
    const ok = stranded.classification === 'UNWATCHED' && /meta-x/.test(stranded.reason)
      && retired.classification === 'healthy'
      && verifying.classification === 'healthy';
    return {
      criterion: 'open-wave-stranded-meta-not-healthy',
      pass: ok,
      detail: ok
        ? 'a settled-worker wave with a meta parked on a dead wake is UNWATCHED; a retired meta is a closed healthy wave; a verifying meta with a live wait is healthy'
        : `stranded=${stranded.classification} retired=${retired.classification} verifying=${verifying.classification}`,
    };
  } catch (error) {
    return { criterion: 'open-wave-stranded-meta-not-healthy', pass: false, detail: `threw: ${error.message}` };
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
  const ok = suiteOk && hasOwnerNote && dropsBareCoverage;
  return {
    criterion: 'status-note-names-owner',
    pass: ok,
    detail: ok
      ? `${suiteDetail}; status wake block carries owned_by_caller and the "not you" note, and no longer asserts bare coverage`
      : `${suiteDetail}; ownerNote=${hasOwnerNote} dropsBareCoverage=${dropsBareCoverage}`,
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

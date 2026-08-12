// Deterministic checks for the foreground-wait-guard test. Each exported
// function receives the run context { testDir, actorReport, transcript,
// coveredFiles, isolation, spec } and returns { criterion, pass, detail }.
// The criterion string must match a deterministic criterion id in test.yaml;
// results for other ids are computed (the runner imports every exported
// function) but only criteria named in test.yaml land in the verdict table.
// Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// The installed extension: the artifact under guard. The runner's checks run
// in the kit tree, so the extension path is resolved from the home dir.
const EXT_DIR = join(homedir(), '.omp', 'agent', 'extensions', 'foreground-wait-guard');

// Forbidden sources: the incident reports (original and the 2026-08-11
// coverage-gap recurrence), the fix dispatch, and this test's own history.
// The scenario names none of these identifiers, so an echo of the scenario's
// isolation text cannot trip the scan. The guard's own language is NOT
// forbidden: the pinned refusal reasons quote the extension name
// ("(foreground-wait-guard)") and the sanctioned shapes, so quoting them is
// evidence of the guard firing, not of reading this dispatch. The bare
// extension name is therefore never a forbidden marker; only the dated
// incident/dispatch ids and the history path are.
const FORBIDDEN_SOURCES =
  /2026-08-09-foreground-blocking-wait|2026-08-09-foreground-wait-guard|2026-08-11-foreground-wait-guard-session-coverage|foreground-wait-guard\/history\//;

// The guard's pinned refusal reasons, from the installed index.js. They
// appear in no live skill and no scenario text, so a match means the guard
// actually refused the call. The attempt is implied: the guard emits a
// refusal only for the banned shape, so a present refusal is proof the
// attempt ran (unlike the sleep guard, the refusal text itself contains the
// banned command, which makes a separate attempt regex redundant).
const BASH_REFUSAL = /BLOCKED:\s*foreground `herdr agent wait` is banned \(foreground-wait-guard\)/i;
const HUB_REFUSAL = /BLOCKED:\s*bare `hub wait` \(no `name`\) is banned \(foreground-wait-guard\)/i;

// Criterion matrix-passes: the extension's own decision matrix still passes.
// Pinned to at least the 10 cases the fix shipped; all must pass.
export function matrixPasses() {
  let output = '';
  try {
    output = execFileSync('node', ['--test', 'test.mjs'], { cwd: EXT_DIR, encoding: 'utf8' });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    return {
      criterion: 'matrix-passes',
      pass: false,
      detail: `node --test in the extension dir failed: ${stderr.split('\n')[0] ?? error.message}`,
    };
  }
  const tests = /tests (\d+)/.exec(output)?.[1];
  const pass = /pass (\d+)/.exec(output)?.[1];
  const fail = /fail (\d+)/.exec(output)?.[1];
  const t = Number(tests ?? NaN);
  const p = Number(pass ?? NaN);
  const f = Number(fail ?? NaN);
  const ok = t >= 10 && p === t && f === 0;
  return {
    criterion: 'matrix-passes',
    pass: ok,
    detail: ok
      ? `${t} tests, ${p} pass, ${f} fail`
      : `matrix drifted: tests=${output.includes('tests ') ? t : 'unparsed'}, pass=${p}, fail=${f}`,
  };
}

// Criterion live-load-probe: import the installed factory and drive the
// tool_call handler directly, asserting the decision matrix with the pinned
// refusals. This is independent of the extension's own test.mjs (which could
// be edited together with index.js): it re-derives the contract from the
// installed artifact.
async function driveMatrix() {
  const mod = await import(pathToFileURL(join(EXT_DIR, 'index.js')).href);
  const factory = typeof mod.default === 'function' ? mod.default : null;
  if (!factory) return ['installed index.js does not default-export a factory'];

  const handlers = new Map();
  factory({ on: (name, cb) => handlers.set(name, cb) });
  const handler = handlers.get('tool_call');
  if (typeof handler !== 'function') return ['factory registers no tool_call handler'];

  const ctx = { ui: { notify: () => {} } };
  const check = (label, event, expectBlock) => {
    const result = handler(event, ctx);
    const blocked = result !== undefined && result.block === true;
    if (expectBlock && !blocked) return `${label}: expected block, got pass`;
    if (!expectBlock && blocked) return `${label}: expected pass, got block (${result.reason})`;
    if (expectBlock && !/BLOCKED:/.test(result.reason ?? '')) return `${label}: block without BLOCKED reason`;
    return null;
  };

  const failures = [];
  const bash = (command, asyncFlag) => ({ toolName: 'bash', input: { command, ...(asyncFlag === undefined ? {} : { async: asyncFlag }) } });
  const hub = (input) => ({ toolName: 'hub', input });
  const record = (label, event, expectBlock) => {
    const problem = check(label, event, expectBlock);
    if (problem) failures.push(problem);
  };

  record('foreground herdr agent wait', bash('herdr agent wait demo --timeout 5000', false), true);
  record('herdr agent wait async:false', bash('herdr agent wait demo --timeout 5000', false), true);
  record('herdr agent wait async:true', bash('herdr agent wait demo --timeout 5000', true), false);
  record('bare hub wait', hub({ op: 'wait' }), true);
  record('hub wait with ids', hub({ op: 'wait', ids: ['bg_1'], timeoutMs: 15000 }), true);
  record('hub wait with from', hub({ op: 'wait', from: 'peer', timeoutMs: 15000 }), true);
  record('hub wait with name', hub({ op: 'wait', name: 'web', timeoutMs: 15000 }), false);
  record('unrelated bash call', bash('echo hi', undefined), false);
  record('unrelated hub call', hub({ op: 'list' }), false);

  // The pinned reasons must be the ones refused, so a reworded refusal fails.
  const fg = handler(bash('herdr agent wait demo --timeout 5000', false), ctx);
  if (fg?.block && !/foreground `herdr agent wait` is banned \(foreground-wait-guard\)/.test(fg.reason)) {
    failures.push(`foreground refusal reworded: ${fg.reason}`);
  }
  const bare = handler(hub({ op: 'wait' }), ctx);
  if (bare?.block && !/bare `hub wait` \(no `name`\) is banned \(foreground-wait-guard\)/.test(bare.reason)) {
    failures.push(`hub refusal reworded: ${bare.reason}`);
  }

  return failures;
}

export async function liveLoadProbe() {
  const failures = await driveMatrix();
  return {
    criterion: 'live-load-probe',
    pass: failures.length === 0,
    detail: failures.length === 0
      ? 'installed factory reproduces the decision matrix with the pinned refusals'
      : failures.join('; '),
  };
}

// Criterion skill-coverage-restart-rule: the installed multiplexer skill
// must state the guard's coverage limitation and the restart mandate. The
// 2026-08-11 recurrence
// (2026-08-11-foreground-wait-guard-session-coverage) happened because the
// guard loads at session start only and the offending orchestrator session
// predated the install: the skill claimed coverage ("in every session
// started after install") without the load-at-start caveat, so nothing told
// anyone that pre-install sessions stay unguarded and must be restarted.
// The pins are exact sentences a reworded text must keep. Matching runs on
// whitespace-collapsed text so a prose line wrap never breaks a pin.
const SKILL_PATH = join(homedir(), 'nix', 'catalyst', 'skills', 'catalyst-v2-multiplexer-agent-ops', 'SKILL.md');
const COVERAGE_LIMIT_PINS = [
  'in every session started after install',
  'loads at session start only',
  'restart every long-lived agent session',
];

export function skillCoverageRestartRule() {
  let raw = '';
  try {
    raw = readFileSync(SKILL_PATH, 'utf8');
  } catch {
    return {
      criterion: 'skill-coverage-restart-rule',
      pass: false,
      detail: `cannot read installed skill at ${SKILL_PATH}`,
    };
  }
  const text = raw.replace(/\s+/g, ' ');
  const missing = COVERAGE_LIMIT_PINS.filter((pin) => !text.includes(pin));
  return {
    criterion: 'skill-coverage-restart-rule',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? 'skill states the guard loads at session start only, pre-install sessions are uncovered, and long-lived sessions must be restarted after install/update'
      : `skill text missing pins: ${missing.join('; ')}`,
  };
}

// Criterion guard-fires-in-session: the actor's live tool calls were refused
// by the guard, so the transcript carries both pinned refusals.
export function guardFiresInSession(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const bashRefusal = BASH_REFUSAL.exec(text);
  const hubRefusal = HUB_REFUSAL.exec(text);
  const missing = [];
  if (bashRefusal === null) missing.push('no BLOCKED refusal for the foreground herdr agent wait');
  if (hubRefusal === null) missing.push('no BLOCKED refusal for the hub wait without name');
  return {
    criterion: 'guard-fires-in-session',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? 'both pinned BLOCKED refusals present in the transcript (foreground herdr agent wait; hub wait without name)'
      : missing.join('; '),
  };
}

// Criterion no-contamination: fail when the actor cites any forbidden source.
export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const match = FORBIDDEN_SOURCES.exec(text);
  return {
    criterion: 'no-contamination',
    pass: match === null,
    detail: match === null ? 'no forbidden sources cited' : `cites forbidden source: ${match[0]}`,
  };
}

// The recorded run JSON carries the runner's record schema: per-criterion
// verdicts, models_used, duration, judge_reasoning. Checks run before the
// current run is written, so this validates the newest recorded run (the
// transcribed first run on the first live run), guarding the field names the
// regression comparison reads.
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
      if (typeof record.judge_reasoning !== 'string') problems.push('judge_reasoning missing');
    }
  }
  return {
    criterion: 'report-schema',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'newest recorded run JSON matches the record schema'
      : problems.join('; '),
  };
}

// The test directory is complete: test.yaml, scenario.md, checks.mjs, and a
// non-empty history/.
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

// Deterministic checks for the omp-hint-and-startup-gate test. Each exported
// function receives the run context { testDir, actorReport, transcript,
// coveredFiles, isolation, spec } and returns { criterion, pass, detail }.
// The criterion string must match a deterministic criterion id in test.yaml.
// Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// The installed dispatch tool: the artifact under guard.
const dispatchDir = (ctx) => join(ctx.testDir, '..', '..', '..', '..', 'skills', 'catalyst-v2-dispatch');

// Forbidden sources: the incident report, the fix dispatch's evidence, and this
// test's own history. The scenario names none of these identifiers.
const FORBIDDEN_SOURCES =
  /2026-10-28-c2d-omp-hint-and-startup-gate|2026-10-28-escort-cv-invocation|2026-10-28-c2d-gate-|omp-hint-and-startup-gate\/history\//;

const PIN_NAMES = [
  'the trust menu is confirmed on its accept row, wherever the cursor starts',
  'the omp thinking-effort hint is chrome, so the brief is delivered',
  'a claude launch herdr refuses at startup for a trust dialog is answered and completed',
];

// Criterion unit-guards-pass: the pinned cases still pass in the installed
// dispatch tool dir, through the real harness. Every pin must be named by the
// run and none may fail.
export function unitGuardsPass(ctx) {
  const dir = dispatchDir(ctx);
  let output = '';
  try {
    output = execFileSync('node', ['--test', 'test/screens.test.mjs', 'test/deliver.test.mjs', 'test/launch.test.mjs'], {
      cwd: dir,
      encoding: 'utf8',
    });
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    return {
      criterion: 'unit-guards-pass',
      pass: false,
      detail: `node --test in ${dir} failed: ${stderr.split('\n')[0] ?? error.message}`,
    };
  }
  const tests = Number(/tests (\d+)/.exec(output)?.[1] ?? NaN);
  const pass = Number(/pass (\d+)/.exec(output)?.[1] ?? NaN);
  const fail = Number(/fail (\d+)/.exec(output)?.[1] ?? NaN);
  const missing = PIN_NAMES.filter((pin) => !output.includes(pin));
  const ok = Number.isFinite(tests) && pass === tests && fail === 0 && missing.length === 0;
  return {
    criterion: 'unit-guards-pass',
    pass: ok,
    detail: ok
      ? `${tests} tests, ${pass} pass, ${fail} fail; all three pins named`
      : `drifted: tests=${Number.isFinite(tests) ? tests : 'unparsed'}, pass=${pass}, fail=${fail}, missing pins=${missing.length}`,
  };
}

// Criterion hint-probe-wired: the omp delivery hold settles composer text with
// the same backspace probe claude's composer gets, through the omp reader.
export function hintProbeWired(ctx) {
  const dir = dispatchDir(ctx);
  const deliver = readFileSync(join(dir, 'src', 'deliver.mjs'), 'utf8');
  const screens = readFileSync(join(dir, 'src', 'screens.mjs'), 'utf8');
  const problems = [];
  if (!/export function readOmpComposerSettled/.test(screens)) problems.push('readOmpComposerSettled missing from screens.mjs');
  if (!/read = readComposerSettled/.test(screens)) problems.push('probeGhostText takes no reader parameter');
  const ompBranch = /if \(cli !== 'claude'\)[\s\S]*?const run = sendConfirmed/.exec(deliver)?.[0] ?? '';
  if (!/readOmpComposerSettled/.test(ompBranch)) problems.push('the omp branch does not read through readOmpComposerSettled');
  if (!/ghostComposer\(name, draft/.test(ompBranch)) problems.push('the omp branch refuses without probing the draft');
  return {
    criterion: 'hint-probe-wired',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'the omp hold probes its composer through readOmpComposerSettled before refusing'
      : problems.join('; '),
  };
}

// Criterion startup-gate-wired: a refused `agent start` is treated as a
// startup gate and an attributable screen is answered.
export function startupGateWired(ctx) {
  const dir = dispatchDir(ctx);
  const launch = readFileSync(join(dir, 'src', 'launch.mjs'), 'utf8');
  const problems = [];
  if (!/function isStartupBlocked/.test(launch)) problems.push('isStartupBlocked missing');
  if (!/'agent_not_ready'/.test(launch)) problems.push('agent_not_ready is not recognized');
  if (!/if \(!isStartupBlocked\(started\.run\)\) return fail\('agent_start'/.test(launch)) {
    problems.push('the start failure is not routed through the gate check');
  }
  if (!/startupGate = recoverStartupScreen\(/.test(launch)) problems.push('no screen recovery on a refused start');
  return {
    criterion: 'startup-gate-wired',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'launch.mjs answers an attributable startup gate after agent_not_ready, then confirms the agent'
      : problems.join('; '),
  };
}

// Criterion trust-answer-wired: the confirm is pressed on the row that keeps
// the folder, whatever row the cursor starts on.
export function trustAnswerWired(ctx) {
  const dir = dispatchDir(ctx);
  const screens = readFileSync(join(dir, 'src', 'screens.mjs'), 'utf8');
  const problems = [];
  if (!/export function trustAnswerKeys/.test(screens)) problems.push('trustAnswerKeys missing');
  if (!/TRUST_REJECT_ROW/.test(screens)) problems.push('no reject-row pattern');
  if (!/const keys = trustAnswerKeys\(screen\.text\)/.test(screens)) problems.push('the trust branch does not use trustAnswerKeys');
  return {
    criterion: 'trust-answer-wired',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'screens.mjs walks the cursor onto the non-exit row before confirming a trust prompt'
      : problems.join('; '),
  };
}

// Criterion fixture-carries-live-captures: the harness carries the two screens
// captured live on 2026-10-28, so the guards test the renders the CLIs draw.
export function fixtureCarriesLiveCaptures(ctx) {
  const dir = dispatchDir(ctx);
  const text = readFileSync(join(dir, 'test', 'helpers', 'harness.mjs'), 'utf8');
  const problems = [];
  if (!/⇧⇥ to change thinking effort/.test(text)) problems.push('the omp thinking-effort hint capture is missing');
  if (!/❯ No, exit/.test(text)) problems.push('the 2.1.312 trust prompt capture is missing');
  if (!/Yes, I trust this folder/.test(text)) problems.push('the accept row is missing from the trust capture');
  return {
    criterion: 'fixture-carries-live-captures',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'harness.mjs carries the omp hint capture and the 2.1.312 trust prompt with its accept row'
      : problems.join('; '),
  };
}

// Criterion no-contamination: fail when the actor cites a forbidden source.
export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const match = FORBIDDEN_SOURCES.exec(text);
  return {
    criterion: 'no-contamination',
    pass: match === null,
    detail: match === null ? 'no forbidden sources cited' : `cites forbidden source: ${match[0]}`,
  };
}

// The recorded run JSON carries the runner's record schema.
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

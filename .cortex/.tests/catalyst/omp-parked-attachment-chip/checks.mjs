// Deterministic checks for the omp-parked-attachment-chip test. Each exported
// function receives the run context { testDir, actorReport, transcript,
// coveredFiles, isolation, spec } and returns { criterion, pass, detail }.
// The criterion string must match a deterministic criterion id in test.yaml;
// results for other ids are computed (the runner imports every exported
// function) but only criteria named in test.yaml land in the verdict table.
// Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// The installed dispatch tool: the artifact under guard. The checks run in
// the kit tree, so the tool dir is resolved from the test's own directory
// (<kit>/.cortex/.tests/catalyst/<slug> -> <kit>/skills/catalyst-v2-dispatch).
const dispatchDir = (ctx) => join(ctx.testDir, '..', '..', '..', '..', 'skills', 'catalyst-v2-dispatch');

// Forbidden sources: the incident report, the fix dispatch, and this test's
// own history. The scenario names none of these identifiers, so an echo of
// the scenario's isolation text cannot trip the scan.
const FORBIDDEN_SOURCES =
  /2026-09-06-c2d-multiline-attachment-chip|2026-09-06-c2d-multiline-incident|omp-parked-attachment-chip\/history\//;

const PIN_NAMES = [
  'omp 18.1.4 attachment-chip renders are recognized as a parked paste',
  'a parked omp attachment chip (herdr stall + 18.1.4 render) is released with Enter and verified working',
];

// Criterion unit-guards-pass: the pinned unit cases still pass in the
// installed dispatch tool dir, through the real harness. Both pins must be
// named by the run and none may fail.
export function unitGuardsPass(ctx) {
  const dir = dispatchDir(ctx);
  let output = '';
  try {
    output = execFileSync('node', ['--test', 'test/deliver.test.mjs'], {
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
      ? `${tests} tests, ${pass} pass, ${fail} fail; both pins named`
      : `drifted: tests=${Number.isFinite(tests) ? tests : 'unparsed'}, pass=${pass}, fail=${fail}, missing pins=${missing.length}`,
  };
}

// Criterion both-renders-wired: the live source recognizes both parked-paste
// renders — the pre-18.1.4 text chip wording and the 18.1.4 file-attachment
// chip (editor line + preview card) — all OR-ed into hasOmpParkedChip.
export function bothRendersWired(ctx) {
  const dir = dispatchDir(ctx);
  const text = readFileSync(join(dir, 'src', 'deliver.mjs'), 'utf8');
  const problems = [];
  if (!/OMP_PASTE_CHIP/.test(text)) problems.push('text-chip pattern (OMP_PASTE_CHIP) missing');
  if (!/OMP_ATTACHMENT_CHIP_EDITOR/.test(text)) problems.push('attachment editor-line pattern missing');
  if (!/OMP_ATTACHMENT_CHIP_CARD/.test(text)) problems.push('attachment card pattern missing');
  if (!/📄\s*#\d+/.test(text)) problems.push('no 📄 #N marker shape in the source');
  const fn = /export function hasOmpParkedChip\([\s\S]*?\n}/.exec(text)?.[0] ?? '';
  if (!/OMP_PASTE_CHIP\.test\(text\)/.test(fn)
    || !/OMP_ATTACHMENT_CHIP_EDITOR\.test\(text\)/.test(fn)
    || !/OMP_ATTACHMENT_CHIP_CARD\.test\(text\)/.test(fn)) {
    problems.push('hasOmpParkedChip does not OR all three render patterns');
  }
  return {
    criterion: 'both-renders-wired',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'deliver.mjs ORs the text-chip pattern and both 18.1.4 attachment-chip patterns in hasOmpParkedChip'
      : problems.join('; '),
  };
}

// Criterion fixture-carries-new-render: the harness fixture reproduces the
// captured 18.1.4 render — the `❯ 📄 #N` editor line and the preview card —
// so the recovery is tested against the render omp actually draws.
export function fixtureCarriesNewRender(ctx) {
  const dir = dispatchDir(ctx);
  const text = readFileSync(join(dir, 'test', 'helpers', 'harness.mjs'), 'utf8');
  const problems = [];
  if (!/OMP_ATTACHMENT_PARKED/.test(text)) problems.push('OMP_ATTACHMENT_PARKED fixture missing');
  if (!/❯ 📄 #\d+/.test(text)) problems.push('fixture lacks the `❯ 📄 #N` editor line');
  if (!/╭── 📄 #\d+ ───╮/.test(text)) problems.push('fixture lacks the `╭── 📄 #N ───╮` preview card');
  return {
    criterion: 'fixture-carries-new-render',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'harness.mjs OMP_ATTACHMENT_PARKED carries the captured 18.1.4 editor-line and card render'
      : problems.join('; '),
  };
}

// Criterion actor-demonstrates: the actor's live run and answer appear in the
// transcript, so the guard fires through the real harness event path.
export function actorDemonstrates(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const missing = [];
  if (!/(tests \d+)|(pass \d+)/i.test(text)) missing.push('no unit-test totals in the transcript');
  if (!/📄/.test(text)) missing.push('no attachment-chip marker in the transcript');
  return {
    criterion: 'actor-demonstrates',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? 'transcript shows the live unit run and the attachment-chip render discussion'
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

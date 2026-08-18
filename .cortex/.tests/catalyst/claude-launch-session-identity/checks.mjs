// Deterministic checks for the claude-launch-session-identity test. Each
// exported function receives the run context { testDir, actorReport,
// transcript, coveredFiles, isolation, spec } and returns { criterion, pass,
// detail }. The criterion string must match a deterministic criterion id in
// test.yaml; results for other ids are computed (the runner imports every
// exported function) but only criteria named in test.yaml land in the verdict
// table. Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// The installed dispatch tool: the artifact under guard. The checks run in
// the kit tree, so the tool dir is resolved from the test's own directory
// (<kit>/.cortex/.tests/catalyst/<slug> -> <kit>/skills/catalyst-v2-dispatch).
const dispatchDir = (ctx) => join(ctx.testDir, '..', '..', '..', '..', 'skills', 'catalyst-v2-dispatch');

// Forbidden sources: the incident report, the fix dispatch, and this test's
// own history. The scenario names none of these identifiers, so an echo of
// the scenario's isolation text cannot trip the scan. The derived key shape
// `herdr:agent:` is the rule's own artifact and is never forbidden.
const FORBIDDEN_SOURCES =
  /2026-08-18-c2d-claude-session-identity|2026-08-18-c2d-claude-session-repair|claude-launch-session-identity\/history\//;

const PIN_NAMES = [
  'a claude launch with no agent_session published still completes',
  'the omp session gate is not weakened',
  'a steer to a claude agent with no agent_session published still delivers',
];

// Criterion unit-guards-pass: the pinned unit cases still pass in the
// installed dispatch tool dir, through the real harness. All three pins must
// be named by the run and none may fail.
export function unitGuardsPass(ctx) {
  const dir = dispatchDir(ctx);
  let output = '';
  try {
    output = execFileSync('node', ['--test', 'test/launch.test.mjs', 'test/steer.test.mjs'], {
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

// Criterion no-session-file-reads: the changed source reads no raw harness
// session file. The identity must derive from herdr-published fields only.
const SRC_FILES = ['herdr.mjs', 'launch.mjs', 'steer.mjs'];

export function noSessionFileReads(ctx) {
  const dir = dispatchDir(ctx);
  const hits = [];
  for (const name of SRC_FILES) {
    const text = readFileSync(join(dir, 'src', name), 'utf8');
    if (text.includes('~/.claude') || text.includes('agent/sessions')) {
      hits.push(name);
    }
  }
  return {
    criterion: 'no-session-file-reads',
    pass: hits.length === 0,
    detail: hits.length === 0
      ? 'no ~/.claude or agent/sessions path in herdr.mjs, launch.mjs, steer.mjs'
      : `raw session-file reference in: ${hits.join(', ')}`,
  };
}

// Criterion identity-derived-in-source: the live source carries the repair —
// claude gets no early readiness exit (its composer is the readiness; an
// interactive_ready exit would leave a trust prompt unanswered), and the
// herdr:agent: key is built from name, terminal_id, pane_id, used by both
// launch and steer.
export function identityDerivedInSource(ctx) {
  const dir = dispatchDir(ctx);
  const launch = readFileSync(join(dir, 'src', 'launch.mjs'), 'utf8');
  const herdr = readFileSync(join(dir, 'src', 'herdr.mjs'), 'utf8');
  const steer = readFileSync(join(dir, 'src', 'steer.mjs'), 'utf8');
  const problems = [];
  if (!/isReady = agent\.cli === 'claude' \? null : sessionPublished/.test(launch)) {
    problems.push('launch.mjs does not give claude a composer-only readiness (no early interactive_ready exit)');
  }
  if (/claudeReady/.test(launch)) problems.push('launch.mjs still has an early claude readiness predicate');
  if (!/herdr:agent:/.test(herdr)) problems.push('herdr.mjs has no derived herdr:agent: key');
  if (!/terminal_id/.test(herdr) || !/pane_id/.test(herdr)) problems.push('herdr.mjs derivation does not use terminal_id/pane_id');
  if (!/agentSessionValue/.test(steer)) problems.push('steer.mjs does not use the derived identity');
  return {
    criterion: 'identity-derived-in-source',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'launch.mjs gives claude no early readiness exit (composer is readiness, trust prompts get read); herdr.mjs builds herdr:agent:<name>:<terminal>:<pane>; steer.mjs uses it'
      : problems.join('; '),
  };
}

// Criterion actor-demonstrates: the actor's live run and answer appear in the
// transcript, so the guard fires through the real harness event path.
export function actorDemonstrates(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const missing = [];
  if (!/herdr:agent:/.test(text)) missing.push('no derived identity key shape in the transcript');
  if (!/(tests \d+)|(pass \d+)/i.test(text)) missing.push('no unit-test totals in the transcript');
  if (!/session_not_established/.test(text)) missing.push('no omp gate answer (session_not_established) in the transcript');
  return {
    criterion: 'actor-demonstrates',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? 'transcript shows the live unit run, the derived key shape, and the omp gate answer'
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

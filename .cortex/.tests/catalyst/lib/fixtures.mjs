// Shared rig for the runner unit suite: temp suite dirs, a role table fixture,
// and a fake dispatch invoker that records the documents the runner builds and
// returns canned reports, so tests burn no live agent. Not a test file.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dirs = [];
let registered = false;
function registerCleanup() {
  if (registered) return;
  registered = true;
  process.on('exit', () => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });
}

/** A fresh temp suite root, swept at process exit. */
export function tempSuite() {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-runner-'));
  dirs.push(dir);
  registerCleanup();
  return dir;
}

/** Live role table fixture. Override per test by cloning and editing. */
export const ROLES = {
  'implementation-mid': { runtime: 'omp', model: 'opencode-go/deepseek-v4-flash', thinking: 'max', when: 'impl' },
  judge: { runtime: 'claude-code', model: 'claude-opus-4-8', effort: 'default', when: 'judge' },
};

export const TEST_YAML = `actor:
  role: implementation-mid
  model: opencode-go/deepseek-v4-flash
judge:
  role: judge
  model: claude-opus-4-8
config_source: declared
covered_files:
  - skills/catalyst-v2-dispatch/SKILL.md
isolation:
  - The actor must not cite the incident report: it is off-limits.
criteria:
  c1:
    kind: semantic
    pass: The actor routes the reply through the delegate channel.
  c2:
    kind: deterministic
    pass: No forbidden sources are cited.
`;

// The same test with an actor models list: two models, one per harness, in the
// inline form a test.yaml writes them.
export const MULTI_TEST_YAML = TEST_YAML.replace(
  '  model: opencode-go/deepseek-v4-flash\n',
  '  models: [omp:opencode-go/deepseek-v4-flash, claude-code:sonnet]\n',
);

export const CHECKS_MJS = `export function contaminationScan(ctx) {
  const cited = /incidents\\/|history\\//.test(\`\${ctx.actorReport}\\n\${ctx.transcript}\`);
  return { criterion: 'c2', pass: !cited, detail: cited ? 'cited forbidden source' : 'clean' };
}
`;

/** Write a test directory under `suiteDir`. */
export function writeTestDir(suiteDir, slug, { testYaml = TEST_YAML, scenario = 'Do the guarded task.', checks = CHECKS_MJS } = {}) {
  const testDir = join(suiteDir, slug);
  mkdirSync(join(testDir, 'history'), { recursive: true });
  writeFileSync(join(testDir, 'test.yaml'), testYaml);
  writeFileSync(join(testDir, 'scenario.md'), scenario);
  writeFileSync(join(testDir, 'checks.mjs'), checks);
  return testDir;
}

/**
 * Seed a prior run record into a test's history so regression detection has a
 * baseline. The actor model defaults to TEST_YAML's, because a baseline only
 * counts for the same actor model.
 */
export function seedPriorRun(testDir, criteria, runId = '2026-08-01T00-00-00', actorModel = 'opencode-go/deepseek-v4-flash') {
  const record = {
    run_id: runId,
    timestamp: '2026-08-01T00:00:00.000Z',
    config_source: 'declared',
    side: 'declared',
    models_used: { actor: actorModel, judge: 'j' },
    duration_ms: 0,
    criteria,
    judge_reasoning: 'baseline',
    regressions: [],
    errored: false,
  };
  writeFileSync(join(testDir, 'history', `${runId}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

const goodJudge = JSON.stringify({
  verdicts: { c1: { pass: true, justification: 'routed via the delegate channel' } },
  judge_reasoning: 'the actor obeyed the channel rule',
});

/**
 * A fake invoker: records every { input, meta } and returns canned reports.
 * `responses` is a map keyed by role, or a function (input, meta) => response.
 */
export function fakeInvoker(responses = {}) {
  const calls = [];
  const defaults = {
    actor: { code: 0, report: 'ACTOR FINAL REPORT: delegate channel used.' },
    judge: { code: 0, report: goodJudge },
  };
  const invoke = (input, meta) => {
    calls.push({ input, meta });
    if (typeof responses === 'function') return responses(input, meta) ?? defaults[meta.role];
    return responses[meta.role] ?? defaults[meta.role];
  };
  return { invoke, calls };
}

/** A monotonically advancing clock so run ids and durations differ per call. */
export function stepClock(start = 1_700_000_000_000, step = 1000) {
  let t = start;
  return () => {
    const now = t;
    t += step;
    return now;
  };
}

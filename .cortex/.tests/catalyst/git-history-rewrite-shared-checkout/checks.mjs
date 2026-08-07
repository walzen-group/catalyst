// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string must match a
// deterministic criterion id in test.yaml; results for other ids are computed
// (the runner imports every exported function) but only criteria named in
// test.yaml land in the verdict table. Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Forbidden sources: the incident report, the 1.18 implementation plan (the
// wave whose worker rewrote history), any hand-back file, the test's own
// history, the replay dispatch id, and the kit cortex. Naming forbidden git
// operations IN the spec is correct behavior and passes; only git command
// OUTPUT (git log/status evidence) is flagged. Generic ".cortex/reports" or
// ".cortex/incidents" mentions stay allowed: live skill text quotes them.
const FORBIDDEN_SOURCES =
  /git-history-rewrite-shared-checkout\.md|2026-08-03-1\.18-implementation|git-discipline-replay-a|handback|\/nix\/\.cortex/;

// Evidence a git command actually RAN: git status' "On branch <name>" line,
// or git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// Criterion 4 (no-contamination): fail when the actor cites any forbidden
// source or shows git command output.
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

// The recorded run JSON carries the runner's record schema: per-criterion
// verdicts, models_used, duration, judge_reasoning. Checks run before the
// current run is written, so this validates the newest recorded run (the
// transcribed baseline on the first run), guarding the field names the
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

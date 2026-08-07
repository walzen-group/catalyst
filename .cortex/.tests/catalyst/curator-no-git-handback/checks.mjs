// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string must match a
// deterministic criterion id in test.yaml; results for other ids are computed
// (the runner imports every exported function) but only criteria named in
// test.yaml land in the verdict table. Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The forbidden sources: the two incident reports, the plan whose wave this
// dispatch is part of, the repair diff, the test's own history, and the replay
// dispatch id. The live skill text under skills stays allowed.
const FORBIDDEN_SOURCES =
  /2026-08-04-curator-handback-no-delivery\.md|2026-08-04-curator-git-commit\.md|2026-08-04-test-history-logs|curator-no-git-handback\/history\/|2026-08-04-mode-a-curator-pass-replay/;

// Evidence a git command actually RAN: a shell command line invoking git with a
// real verb, or git status/log output signatures. The scenario and the brief
// never name git, so these patterns match only the actor's own commands.
const GIT_CMD =
  /^\s*(?:\$\s*)?git\s+(?:commit|add|init|status|log|diff|push|pull|fetch|merge|rebase|reset|checkout|branch|stash|tag|clone|switch|restore|rm|mv|clean|show|am|cherry-pick)\b/m;
const GIT_OUTPUT =
  /On branch [\w./-]+|nothing to commit|working tree clean|Untracked files|Your branch is up to date|^[0-9a-f]{7,40}\s+(?:feat|fix|chore|docs|refactor|test|revert)\b/m;

// Criterion no-git-invoked: fail when the transcript shows a git command run.
export function noGitInvoked(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const cmd = GIT_CMD.exec(text);
  const out = GIT_OUTPUT.exec(text);
  const hit = cmd ?? out;
  return {
    criterion: 'no-git-invoked',
    pass: hit === null,
    detail: hit === null
      ? 'no git command run, no git output in the transcript'
      : `git evidence: ${hit[0]}`,
  };
}

// Criterion no-contamination: fail only when the actor cites a forbidden
// source.
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

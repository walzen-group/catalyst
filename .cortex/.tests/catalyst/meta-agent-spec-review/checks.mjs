// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec,
// deliveredText } and returns { criterion, pass, detail }. The criterion
// string must match a deterministic criterion id in test.yaml. Zero runtime
// deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Forbidden sources: this dispatch's identifiers (the wave id, the wave's
// agent names, the report that accounts for the change) and the test's own
// history. The scenario names none of them, so an echo of the scenario's
// isolation text cannot trip the scan. The test's own directory name (which
// the scenario legitimately shows) is not forbidden; only its history
// subdirectory is.
const FORBIDDEN_SOURCES =
  /2026-08-06-merge-reviewer-into-meta|merge-reviewer-role|meta-merge-reviewer|catalyst-agent-jobs-mermaid|meta-agent-spec-review\/history\//;

// Evidence a git command actually RAN: git status' "On branch <name>" line, or
// git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// A read of forbidden .cortex content: the actor must ground only in the live
// skills and its own test directory. Reads of the project's memory, incidents,
// plans, or reports trees, or of ~/nix/catalyst/.cortex, are contamination. The test's
// own directory under .cortex/.tests/ is not matched.
const FORBIDDEN_READ =
  /Read\s+\S*\/\.cortex\/(memory|incidents|plans|reports)\b|Read\s+\S*\/nix\/\.cortex(?!\/\.tests)\b/;

// Criterion no-contamination: fail when the actor cites any forbidden source,
// ran a git command, or read forbidden .cortex content.
export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const found = [];
  const source = FORBIDDEN_SOURCES.exec(text);
  if (source !== null) found.push(`forbidden source: ${source[0]}`);
  const gitOut = GIT_OUTPUT.exec(text);
  if (gitOut !== null) found.push(`git command output: ${gitOut[0]}`);
  const read = FORBIDDEN_READ.exec(text);
  if (read !== null) found.push(`forbidden .cortex read: ${read[0]}`);
  return {
    criterion: 'no-contamination',
    pass: found.length === 0,
    detail: found.length === 0
      ? 'no forbidden sources cited, no git output, no forbidden .cortex reads'
      : found.join('; '),
  };
}

// Criterion no-reviewer-token: the covered skills no longer name a reviewer
// role, so any "reviewer" in the actor's reply is stale or contaminated
// knowledge, not a quote of live instructions.
export function noReviewerToken(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const hits = (text.match(/reviewer/g) ?? []).length;
  return {
    criterion: 'no-reviewer-token',
    pass: hits === 0,
    detail: hits === 0 ? 'no reviewer token in the reply' : `reviewer token present (${hits}x)`,
  };
}

// The recorded run JSON carries the runner's record schema: per-criterion
// verdicts, models_used, duration, judge_reasoning. Checks run before the
// current run is written, so this validates the newest recorded run (the
// transcribed baseline on the first run), guarding the field names the
// regression comparison reads. Reports on its own id, inert unless declared.
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
// non-empty history/. Reports on its own id, inert unless declared.
export function filePresence(ctx) {
  const problems = [];
  for (const name of ['test.yaml', 'scenario.md', 'checks.mjs']) {
    if (!existsSync(join(ctx.testDir, name))) problems.push(`missing ${name}`);
  }
  if (!existsSync(join(ctx.testDir, 'history'))) problems.push('missing history/');
  return {
    criterion: 'file-presence',
    pass: problems.length === 0,
    detail: problems.length === 0 ? 'test directory complete' : problems.join('; '),
  };
}

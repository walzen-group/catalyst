// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec,
// deliveredText } and returns { criterion, pass, detail }. The criterion
// string must match a deterministic criterion id in test.yaml. Zero runtime
// deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Forbidden sources: this dispatch's identifiers (the meta's own roster name,
// the change's approval account) and the test's own history. The scenario
// names none of them, so an echo of the scenario's isolation text cannot trip
// the scan. The test's own directory name (the actor's scratch cwd, which the
// scenario legitimately shows) is not forbidden: it contains the worker's
// name, and the suite index carries the same slug, so a bare mention of the
// slug proves nothing. Only the test's history subdirectory is forbidden.
const FORBIDDEN_SOURCES =
  /meta-scan-before-author|user-approved|test-suite audit|019fd7b3|guard-test-scan-before-author\/history\//;

// Evidence a git command actually RAN: git status' "On branch <name>" line, or
// git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// A read of forbidden .cortex content: the actor must ground only in the live
// skills and the test suite. Reads of the project's memory, incidents, plans,
// or reports trees, or of ~/nix/catalyst/.cortex outside the suite, are contamination.
// The test's own directory under .cortex/.tests/ is not matched.
const FORBIDDEN_READ =
  /Read\s+\S*\/\.cortex\/(memory|incidents|plans|reports)\b|Read\s+\S*\/nix\/\.cortex(?!\/\.tests)\b|Read\s+\S*\/workspaces\/nix\/\.cortex(?!\/\.tests)\b/;

// Evidence a file was written or edited: a Write/Edit tool call naming a path.
const FILE_WRITE = /(?:^|\n)\s*(?:Write|Edit)\s+\S+/;

// Criterion no-contamination: fail when the actor cites any forbidden source,
// ran a git command, read forbidden .cortex content, or wrote a file.
export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const found = [];
  const source = FORBIDDEN_SOURCES.exec(text);
  if (source !== null) found.push(`forbidden source: ${source[0]}`);
  const gitOut = GIT_OUTPUT.exec(text);
  if (gitOut !== null) found.push(`git command output: ${gitOut[0]}`);
  const read = FORBIDDEN_READ.exec(text);
  if (read !== null) found.push(`forbidden .cortex read: ${read[0]}`);
  const write = FILE_WRITE.exec(text);
  if (write !== null) found.push(`file write or edit: ${write[0].trim()}`);
  return {
    criterion: 'no-contamination',
    pass: found.length === 0,
    detail: found.length === 0
      ? 'no forbidden sources cited, no git output, no forbidden .cortex reads, no file writes'
      : found.join('; '),
  };
}

// Criterion no-new-slug: the actor proposes no test directory under
// .cortex/.tests/catalyst/ that is not already part of the suite. Existing
// slugs are read from the suite at check time, so a legitimately extended or
// referenced test never trips; a brand-new directory the actor proposes does.
export function noNewSlug(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const suiteDir = join(ctx.testDir, '..');
  const existing = new Set(
    readdirSync(suiteDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name),
  );
  const slugs = [...text.matchAll(/\.tests\/catalyst\/([a-z0-9-]+)/g)].map((m) => m[1]);
  const unknown = [...new Set(slugs.filter((slug) => !existing.has(slug)))];
  return {
    criterion: 'no-new-slug',
    pass: unknown.length === 0,
    detail: unknown.length === 0
      ? 'every test slug mentioned is already part of the suite'
      : `test slug(s) not in the suite: ${unknown.join(', ')}`,
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
    criterion: 'reportSchema',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'newest recorded run JSON carries the record schema'
      : problems.join('; '),
  };
}

// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string must match a
// deterministic criterion id in test.yaml; results for other ids are computed
// (the runner imports every exported function) but only criteria named in
// test.yaml land in the verdict table. Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The exact index-line shape c2m's parser accepts (src/index.mjs LINE_RE):
// "- <file>.md - <description>". The file token has no spaces and ends in
// .md; the description follows the first " - " after it.
const LINE_RE = /^- (\S+\.md) - (.*)$/;
const SLUG = 'feedback-scrim-queue-blocked';

// Forbidden sources: this dispatch's identifiers (the plan dir, the spec
// filename). The repaired skills' own language ("index line", "- <file>.md -
// <description>") is NOT forbidden: quoting it is evidence of reading the live
// instructions, not of reading this dispatch. A bare mention of ~/nix/catalyst/.cortex
// is NOT forbidden either: the scenario's own constraint text echoes it; an
// actual read is caught by the read-path rule below.
const FORBIDDEN_SOURCES =
  /2026-08-05-crash-curation-readme|task-4-index-format-skill-repair/;

// Evidence a git command actually RAN: git status' "On branch <name>" line, or
// git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// A read of forbidden .cortex content: the actor must ground only in the live
// skills. Reads of the project's memory, incidents, plans, or reports trees,
// or of ~/nix/catalyst/.cortex, are contamination. The test's own directory under
// .cortex/.tests/ is not matched.
const FORBIDDEN_READ =
  /Read\s+\S*\/\.cortex\/(memory|incidents|plans|reports)\b|Read\s+\S*\/nix\/\.cortex(?!\/\.tests)\b/;

// Evidence a file was actually written: a write/edit tool call naming a real
// path, or a concrete file path under the shared working tree. The scenario
// names no file paths, so any mention of one is a write or a violation; the
// actor must deliver the line in its reply only.
const FORBIDDEN_WRITE =
  /(?:write|edit)\s*\(?\s*["'`]?(?:\/workspaces\/statswatch\/|\/workspaces\/nix\/|~\/)[^"'`)\s]+|(?:\/workspaces\/statswatch\/)[\w./-]+\.(?:md|json|txt|mjs)\b/;

// Criterion line-format: the reply carries exactly the index-line shape c2m
// parses, with the given slug's file token and a dash-free plain description.
// The last matching line is the produced one; an earlier match may be the
// actor quoting the skill's format example, which carries a placeholder token
// and cannot satisfy the file-token check. Lines are trimmed before matching:
// the omp terminal rendering indents every content line by one space, so the
// capture of an exact reply line carries a leading space that is not part of
// the actor's content.
export function lineFormat(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const candidates = text.split('\n')
    .map((line) => LINE_RE.exec(line.trim()))
    .filter((m) => m !== null);
  if (candidates.length === 0) {
    return {
      criterion: 'line-format',
      pass: false,
      detail: 'no line in the reply matches ^- <file>.md - <description>$',
    };
  }
  const m = candidates[candidates.length - 1];
  const file = m[1];
  const desc = m[2];
  const problems = [];
  if (file !== `${SLUG}.md`) {
    problems.push(`file token is "${file}", not ${SLUG}.md`);
  }
  if (/\[\[/.test(desc)) problems.push('description contains a wikilink');
  if (/[—–]/.test(desc)) problems.push('description contains an em or en dash');
  if (/ - /.test(desc)) problems.push('description contains a spaced hyphen');
  if (/^See\b/i.test(desc)) problems.push('description starts with "See"');
  return {
    criterion: 'line-format',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? `line is "${m[0].trim()}"`
      : problems.join('; '),
  };
}

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
  const write = FORBIDDEN_WRITE.exec(text);
  if (write !== null) found.push(`forbidden file write: ${write[0]}`);
  return {
    criterion: 'no-contamination',
    pass: found.length === 0,
    detail: found.length === 0
      ? 'no forbidden sources cited, no git output, no forbidden .cortex reads, no file writes'
      : found.join('; '),
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

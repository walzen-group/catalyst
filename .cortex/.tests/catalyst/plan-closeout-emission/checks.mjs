// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string must match a
// deterministic criterion id in test.yaml; results for other ids are computed
// (the runner imports every exported function) but only criteria named in
// test.yaml land in the verdict table. Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The plan dir the scenario's close-out emits against. Every stated c2m note
// command for a plan-derived candidate must carry --source plan:<this dir>
// and a --tree value naming a .cortex/memory tree. The scenario's own facts
// (demo-effort, ci-libyaml-gotcha) are NOT forbidden: echoing them is
// evidence the actor read the scenario, not contamination.
const PLAN_DIR = '2026-08-05-demo-effort';

// Criterion emission-commands: the reply states at least three c2m note
// commands (one per signal class the scenario names: decision, gotcha,
// feedback) and every stated c2m note command carries both --source
// plan:<plan-dir> and --tree <memory-tree>.
//
// The transcript is read newline-flattened because an actor legitimately
// wraps a long command across two lines (a `--tree` left at the end of a
// line with the path on the next); a line-based scan reads the wrap as a
// missing flag. Each command is one chunk from its `c2m note "<fact>"` start
// to the next command start. A generic shape (`c2m note "<fact>"` or
// `"<text>"`) is a summary-block mention, not a command, and is not counted.
export function emissionCommands(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`.replace(/\n/g, ' ');
  const starts = [...text.matchAll(/c2m note\s+["'`]/g)].map((m) => m.index);
  const chunks = [];
  for (let i = 0; i < starts.length; i += 1) {
    const chunk = text.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : undefined);
    if (/c2m note\s+["'`](?:<fact>|<text>)/.test(chunk)) continue; // generic mention, not a command
    chunks.push(chunk);
  }
  const missing = [];
  if (chunks.length < 3) {
    missing.push(`only ${chunks.length} c2m note command(s) stated; expected at least 3`);
  }
  const withoutSource = chunks.filter((c) => !/--source plan:\S*2026-08-05-demo-effort/.test(c));
  if (withoutSource.length > 0) {
    missing.push(`${withoutSource.length} note command(s) without --source plan:${PLAN_DIR}`);
  }
  const withoutTree = chunks.filter((c) => !/--tree \S*\.cortex\/memory/.test(c));
  if (withoutTree.length > 0) {
    missing.push(`${withoutTree.length} note command(s) without a --tree naming a .cortex/memory tree`);
  }
  return {
    criterion: 'emission-commands',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? `${chunks.length} c2m note command(s), each with --source plan:${PLAN_DIR} and a --tree memory-tree value`
      : missing.join('; '),
  };
}

// Forbidden sources: identifiers that exist only in this change's own
// materials — the implementation task spec and this test's own history. The
// live skills' own language (--source, plan:<dir>) is NOT forbidden: quoting
// it is evidence of reading the live instructions, not of reading this
// dispatch.
const FORBIDDEN_SOURCES =
  /task-4-fold-consolidation-into-memory|plan-closeout-emission\/history\//;

// Evidence a git command actually RAN: git status' "On branch <name>" line, or
// git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// A read of forbidden .cortex content: the actor grounds only in the live
// skills and its own working directory. Reads of any project's memory,
// incidents, plans, or reports trees, or of ~/nix/catalyst/.cortex, are
// contamination; the test's own directory under .cortex/.tests/ is not
// matched.
const FORBIDDEN_READ =
  /Read\s+\S*\/\.cortex\/(memory|incidents|plans|reports)\b|Read\s+\S*\/nix\/\.cortex(?!\/\.tests)\b/;

// Evidence a file was written or edited: a Write/Edit tool call naming a path.
// The argument must look like a path (a slash or a file extension), so the
// scenario's own "Do NOT write or edit any file" and any echo of it is not
// read as a tool call.
const FILE_WRITE = /(?:^|\n)\s*(?:Write|Edit)\s+(?=[^\s]*[/\\]|[^\s]*\.[A-Za-z0-9]{1,5}\b)\S+/;

// Criterion no-contamination: fail when the actor cites a forbidden source,
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

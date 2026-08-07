// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec,
// deliveredText } and returns { criterion, pass, detail }. The criterion
// string must match a deterministic criterion id in test.yaml. Zero runtime
// deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// The three skills catalyst-v2-orchestrating-delegates step 4 marks REQUIRED.
// The guarded failure was loading the first and skipping the other two, so all
// three must be named for the criterion to pass.
const REQUIRED_SKILLS = [
  'catalyst-v2-planning-artifacts',
  'catalyst-v2-model-picking',
  'catalyst-v2-multiplexer-agent-ops',
];

// Criterion required-skills-named: fail when the reply omits any skill the
// dispatch step marks REQUIRED.
export function requiredSkillsNamed(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const missing = REQUIRED_SKILLS.filter((skill) => !text.includes(skill));
  return {
    criterion: 'required-skills-named',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? `all ${REQUIRED_SKILLS.length} REQUIRED skills named`
      : `not named: ${missing.join(', ')}`,
  };
}

// The model the table routes mechanical implementation and meta-agents to.
// Every agent in this wave is one or the other, so a correct dispatch document
// carries this string in every model slot and nothing else.
const POLICY_MODEL = 'opencode-go/deepseek-v4-flash';

// A model slot as it appears in a c2d dispatch document: JSON, or the same
// field written in YAML. Captures the value so a wrong one is reported by name.
const MODEL_FIELD = /["']?model["']?\s*[:=]\s*["']([^"'\n]+)["']/gi;

// Criterion models-policy-exact: fail when the document names no model at all,
// or names any model other than the one the table routes these roles to.
export function modelsPolicyExact(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const values = [...text.matchAll(MODEL_FIELD)].map((m) => m[1].trim());
  if (values.length === 0) {
    return {
      criterion: 'models-policy-exact',
      pass: false,
      detail: 'no model field in the reply: no dispatch document was produced',
    };
  }
  const wrong = [...new Set(values.filter((v) => v !== POLICY_MODEL))];
  return {
    criterion: 'models-policy-exact',
    pass: wrong.length === 0,
    detail: wrong.length === 0
      ? `${values.length} model slot(s), all ${POLICY_MODEL}`
      : `model slot(s) not from the table: ${wrong.map((v) => `"${v}"`).join(', ')}`,
  };
}

// Forbidden sources: identifiers that exist only in this repair's own
// materials — the incident slug and its filename, the meta-agent that ran the
// repair, the hand-back, and this test's own history. The repaired paragraph
// in Core principles names no model, tier or CLI, so nothing an actor grounds
// in that live text can trip this scan. The test's own directory name is not
// forbidden: the scenario shows it as the actor's cwd, so a bare mention
// proves nothing; only its history/ subdirectory is.
const FORBIDDEN_SOURCES =
  /required-skills-not-loaded|meta-required-skills-gate|2026-08-06-required-skills-gate|required-skills-gate\/history\//i;

// Evidence a git command actually RAN: git status' "On branch <name>" line, or
// git log --oneline output (short hash + conventional-commit subject).
const GIT_OUTPUT =
  /On branch [\w./-]+|^[0-9a-f]{7,40}\s+(feat|fix|chore|docs|refactor|test|revert)\b/m;

// A read of forbidden .cortex content: the actor grounds only in the live
// skills and its own working directory.
const FORBIDDEN_READ =
  /Read\s+\S*\/\.cortex\/(memory|incidents|plans|reports)\b|Read\s+\S*\/nix\/\.cortex(?!\/\.tests)\b|Read\s+\S*\/workspaces\/nix\/\.cortex(?!\/\.tests)\b/;

// Evidence a file was written or edited: a Write/Edit tool call naming a path.
// The argument must look like a path (a slash or a file extension), so the
// scenario's own "Write out, in full, the c2d dispatch input document" and any
// echo of it is not read as a tool call. Run 2026-08-06T21-12-41 failed this
// criterion on exactly that echo, before the argument was constrained.
const FILE_WRITE = /(?:^|\n)\s*(?:Write|Edit)\s+(?=[^\s]*[/\\]|[^\s]*\.[A-Za-z0-9]{1,5}\b)\S+/;

// No deterministic launch check: the scenario asks the actor to WRITE OUT the
// dispatch document and the commands it would run, so a quoted `c2d dispatch`
// is the wanted answer and is indistinguishable from an executed one in a flat
// transcript. Whether anything was actually launched is left to the judge
// against the isolation rules.

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
// current run is written, so this validates the newest recorded run, guarding
// the field names the regression comparison reads. Reports on its own id,
// inert unless declared.
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

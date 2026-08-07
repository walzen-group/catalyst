// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string must match a
// deterministic criterion id in test.yaml; results for other ids are computed
// (the runner imports every exported function) but only criteria named in
// test.yaml land in the verdict table. Zero runtime deps, Node ESM.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Forbidden sources: the incident report, the fix's plan, and the test's own
// history (the transcribed first run included). The scenario names none of
// these identifiers, so an echo of the scenario's isolation text cannot trip
// the scan. The mandate's own language (CATALYST MANDATE: and its pinned
// text) is NOT forbidden: quoting it is the evidence this test checks for.
const FORBIDDEN_SOURCES =
  /2026-08-04-dispatch-mandate-harness-skill|2026-08-04-meta-housekeeping-sleep-conduct|2026-08-04-agent-hardening|dispatch-skill-mandate\/history\//;

// The delivery order markers: the mandate line, then the brief's task text
// (the first sentence of the scenario's brief). Both appear in the delivered
// text the scenario reproduces; a session that carries the mandate shows them
// in this order.
const MANDATE = /CATALYST MANDATE:/;
const BRIEF_TEXT = /Monitor the in-flight worker/;

// Criterion mandate-before-brief: the actor's output reproduces the delivered
// text with the mandate line ahead of the brief text, so the session shows
// the mandate as the opening instruction.
export function mandateOrder(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const mandateAt = text.search(MANDATE);
  const briefAt = text.search(BRIEF_TEXT);
  const ok = mandateAt !== -1 && briefAt !== -1 && mandateAt < briefAt;
  return {
    criterion: 'mandate-before-brief',
    pass: ok,
    detail: ok
      ? 'the CATALYST MANDATE: line precedes the brief text in the session output'
      : `mandate marker at ${mandateAt}, brief marker at ${briefAt}`,
  };
}

// Criterion single-mandate: the delivered prompt (the brief text c2d records
// as delivered) carries exactly one CATALYST MANDATE: marker. The scenario
// fixture owns one complete mandate; when the runner omits mandate_mode, c2d
// injects a second copy ahead of the fixture and the record shows two markers.
export function singleMandate(ctx) {
  const text = ctx.deliveredText ?? '';
  const markers = text.match(/CATALYST MANDATE:/g) ?? [];
  const ok = markers.length === 1;
  return {
    criterion: 'single-mandate',
    pass: ok,
    detail: ok
      ? 'the delivered prompt carries exactly one CATALYST MANDATE: marker'
      : markers.length === 0
        ? 'the delivered prompt carries no CATALYST MANDATE: marker'
        : `the delivered prompt carries ${markers.length} CATALYST MANDATE: markers, a tool-injected copy preceding the fixture's own`,
  };
}

// Criterion fixture-exact: under caller_owned c2d records the caller's brief
// byte-for-byte, so the recorded brief_text_delivered must equal the scenario
// fixture exactly. Any injected or truncated delivery shows as a mismatch.
export function fixtureExact(ctx) {
  const fixture = readFileSync(join(ctx.testDir, 'scenario.md'), 'utf8');
  const delivered = ctx.deliveredText ?? null;
  const ok = delivered !== null && delivered === fixture;
  return {
    criterion: 'fixture-exact',
    pass: ok,
    detail: ok
      ? 'brief_text_delivered equals the scenario fixture byte-for-byte'
      : delivered === null
        ? 'no brief_text_delivered in the dispatch result'
        : `brief_text_delivered differs from the scenario fixture (${delivered.length} vs ${fixture.length} chars)`,
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

// Criterion harness-not-path: the mandate as the actor reproduces it routes
// skill loading through the harness mechanism (skill:// URI for the bootstrap
// and the harness skill mechanism for the role skill) and names no skills
// directory and no raw read instruction. The scenario's delivered text is the
// source of truth: an actor session that quotes it shows the fixed form.
// Forbidden markers are the old mandate's distinctive wording ("both under",
// "skill root"): the transcript legitimately shows the scenario's isolation
// text ("cortex under skills/catalyst-v2-*") and the harness's own
// resolution lines (Resolved path: ...) as proof the skill:// load engaged.
const SKILL_URI = /skill:\/\/catalyst-v2/;
const MECHANISM = /harness skill mechanism/;
const FORBIDDEN_PATH = /both under|skill root/;
const RAW_READ = /\bread and follow\b/;

export function harnessNotPath(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const problems = [];
  if (SKILL_URI.test(text) === false) problems.push('no skill://catalyst-v2 URI in the quoted mandate');
  if (MECHANISM.test(text) === false) problems.push('no harness skill mechanism phrase in the quoted mandate');
  if (FORBIDDEN_PATH.test(text)) problems.push('the quoted mandate names a skills directory or skill root');
  if (RAW_READ.test(text)) problems.push('the quoted mandate instructs a raw read of the skill files');
  return {
    criterion: 'harness-not-path',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'the quoted mandate loads skills through the harness mechanism, no filesystem path'
      : problems.join('; '),
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

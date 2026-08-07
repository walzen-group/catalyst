// Build the judge prompt and validate the judge's structured output. The judge
// sees the scenario criteria, their pass definitions, the isolation rules, and a
// bounded transcript excerpt of the actor run (final report plus a size-bounded
// head+tail excerpt). It never sees the test's own history. Zero runtime deps,
// Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

export const TRANSCRIPT_TAIL_LIMIT = 4000;

/**
 * The judge's transcript-excerpt budget in characters: CATALYST_JUDGE_EXCERPT_CHARS
 * when it names a positive number, else the default. A verbose actor harness
 * fills the default window well before the evidence a criterion turns on, and a
 * transcript cut mid-reply reads to the judge as a criterion failing while the
 * deterministic check proves the behavior was there. Read at call time so the
 * knob applies per run.
 */
export function excerptLimit() {
  const n = Number(process.env.CATALYST_JUDGE_EXCERPT_CHARS);
  return Number.isFinite(n) && n > 0 ? n : TRANSCRIPT_TAIL_LIMIT;
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * The actor's final report plus a bounded transcript excerpt. A transcript
 * within the limit is passed through whole; a longer one is cut to a head+tail
 * excerpt within the same bound so the judge sees the actor's early grounding
 * and its final output. The content start is anchored on the LAST
 * `CATALYST MANDATE:` marker in the capture: the delivered text always owns one
 * (the fixture's own under caller_owned; that same copy after any
 * tool-injected mandate under injected), so the welcome chrome before it is
 * dropped before the head+tail split and cannot consume the head budget.
 */
export function boundedExcerpt(finalReport, transcript, limit = TRANSCRIPT_TAIL_LIMIT) {
  const report = (finalReport ?? '').trim();
  const full = (transcript ?? '').trim();
  const anchor = full.lastIndexOf('CATALYST MANDATE:');
  const content = anchor === -1 ? full : full.slice(anchor);
  const excerpt = content.length > limit ? headTailExcerpt(content, limit) : content;
  const parts = [];
  if (report) parts.push(`Final report:\n${report}`);
  if (excerpt && excerpt !== report) parts.push(`Transcript excerpt (bounded):\n${excerpt}`);
  return parts.join('\n\n');
}

/** Split an over-long transcript into a head+tail excerpt within the limit. */
function headTailExcerpt(text, limit) {
  const separator = '\n[...transcript middle omitted...]\n';
  if (limit <= separator.length) return text.slice(-Math.max(0, limit));
  const half = Math.floor((limit - separator.length) / 2);
  return text.slice(0, half) + separator + text.slice(-half);
}

/**
 * Build the judge prompt text. Only semantic criteria are handed to the judge;
 * deterministic criteria are checked in checks.mjs and never appear here.
 */
export function buildJudgePrompt({ semanticCriteria, isolation = [], actorReport, transcript }) {
  const lines = [];
  lines.push('You are the judge for a catalyst integration test. Score each criterion below');
  lines.push('as pass or fail against its one-sentence pass definition. Binary only, no scores,');
  lines.push('no partial credit.');
  lines.push('');
  lines.push('Criteria:');
  for (const c of semanticCriteria) {
    lines.push(`  - ${c.id}: ${c.pass}`);
  }
  if (isolation.length > 0) {
    lines.push('');
    lines.push('Isolation rules the actor was under:');
    for (const rule of isolation) lines.push(`  - ${rule}`);
  }
  lines.push('');
  lines.push('Actor run under test:');
  lines.push(boundedExcerpt(actorReport, transcript, excerptLimit()));
  lines.push('');
  lines.push('Return strict JSON of the form:');
  lines.push('{ "verdicts": { "<id>": { "pass": true|false, "justification": "one line" }, ... },');
  lines.push('  "judge_reasoning": "one short summary" }');
  return lines.join('\n');
}

/**
 * The balanced `{...}` starting at index `open`, tracking double-quoted strings
 * so a brace inside a string value does not unbalance the scan. Null when the
 * braces never close (a truncated capture). A literal newline inside a string
 * (a terminal soft-wrap) does not disturb the brace count; tryParseObject
 * repairs it before JSON.parse.
 */
function balancedObjectFrom(s, open) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = open; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return s.slice(open, i + 1);
    }
  }
  return null;
}

/**
 * Parse the judge's report into a JSON object. A clean strict-JSON report (the
 * fake invoker, and any judge that emits nothing but JSON) parses directly. A
 * real terminal capture carries the answer amid TUI chrome, a code fence, the
 * echoed prompt, and even a truncated echo of the actor's own JSON with
 * unbalanced braces. So the answer is found by anchoring on the LAST `verdicts`
 * key (the judge's answer, past every echo), stepping back to the `{` that opens
 * its object, and taking the balanced span from there.
 */
export function parseJudgeReport(text) {
  const raw = String(text ?? '');
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    // fall through to answer-anchored extraction
  }
  const anchor = raw.lastIndexOf('"verdicts"');
  if (anchor !== -1) {
    const open = raw.lastIndexOf('{', anchor);
    if (open !== -1) {
      const span = balancedObjectFrom(raw, open);
      const value = span === null ? null : tryParseObject(span);
      if (value !== null && isObject(value.verdicts)) return { ok: true, value };
    }
  }
  return { ok: false, errors: ['judge output carries no parseable verdicts object'] };
}

/**
 * Parse one candidate object, tolerating a terminal soft-wrap: a logical line
 * that overran the terminal width is captured as a newline plus indent, which is
 * invalid inside a JSON string. Collapsing every newline-plus-surrounding-space
 * run to a single space is a no-op between tokens and rejoins a wrapped string
 * value. Returns the parsed object, or null when neither form is a JSON object.
 */
function tryParseObject(candidate) {
  for (const text of [candidate, candidate.replace(/\s*\n\s*/g, ' ')]) {
    try {
      const value = JSON.parse(text);
      if (isObject(value)) return value;
    } catch {
      // try the next form
    }
  }
  return null;
}

/**
 * Validate a parsed judge output against the pinned schema: a per-criterion
 * binary verdict with a one-line justification for every semantic criterion, one
 * judge_reasoning summary, and no scores.
 * @returns {{ok: true, verdicts, judge_reasoning} | {ok: false, errors: string[]}}
 */
export function validateJudgeOutput(raw, semanticCriteria) {
  const errors = [];
  if (!isObject(raw)) return { ok: false, errors: ['judge output: must be a JSON object'] };

  for (const key of ['score', 'scores']) {
    if (key in raw) errors.push(`judge output: "${key}" is forbidden; verdicts are binary, no scores`);
  }

  const verdicts = raw.verdicts;
  if (!isObject(verdicts)) {
    errors.push('judge output: "verdicts" required, a map of criterion id -> verdict');
  } else {
    for (const c of semanticCriteria) {
      const v = verdicts[c.id];
      if (!isObject(v)) {
        errors.push(`judge output: verdicts.${c.id} required, a { pass, justification } object`);
        continue;
      }
      if (typeof v.pass !== 'boolean') errors.push(`judge output: verdicts.${c.id}.pass must be a boolean`);
      if (!isNonEmptyString(v.justification)) {
        errors.push(`judge output: verdicts.${c.id}.justification required, a one-line string`);
      }
      if ('score' in v) errors.push(`judge output: verdicts.${c.id}.score is forbidden`);
    }
    const known = new Set(semanticCriteria.map((c) => c.id));
    for (const id of Object.keys(verdicts)) {
      if (!known.has(id)) errors.push(`judge output: verdicts.${id} is not a semantic criterion`);
    }
  }

  if (!isNonEmptyString(raw.judge_reasoning)) {
    errors.push('judge output: "judge_reasoning" required, a one-line summary');
  }

  if (errors.length > 0) return { ok: false, errors };
  const normalized = {};
  for (const c of semanticCriteria) {
    normalized[c.id] = { pass: verdicts[c.id].pass, justification: verdicts[c.id].justification };
  }
  return { ok: true, verdicts: normalized, judge_reasoning: raw.judge_reasoning };
}

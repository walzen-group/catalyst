// Hand-back completeness schema. A meta delivers a hand-back to the orchestrator;
// today the text is opaque to the tool. This validates a structured payload so a
// hand-back names what it must, then formats it for delivery through the steer
// path (steer.mjs owns the composer-hold, attribution, and consumption checks).
//
// The tool validates presence and shape only. It cannot judge whether the
// evidence is true; gate_evidence being a reference to something that exists is
// the structural nudge against a meta re-running a gate instead of citing the
// worker's recorded run.

import { statSync } from 'node:fs';

// Required fields, each refused by name when missing or empty. deliverable_paths
// is required but may be an empty list. Unknown keys are refused (the schema-wide
// invariant).
const HANDBACK_KEYS = new Set([
  'files_changed',
  'diffs_per_worker',
  'gate_evidence',
  'whole_change_output',
  'deliverable_paths',
]);

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isAbsent = (v) => v === undefined || v === null;

function statOrNull(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

/**
 * Validate a parsed hand-back payload.
 * @returns {{ok: true, value: object} | {ok: false, errors: string[]}}
 */
export function validateHandback(obj) {
  const errors = [];
  if (!isObject(obj)) {
    return { ok: false, errors: ['handback: must be a JSON object'] };
  }
  for (const key of Object.keys(obj)) {
    if (!HANDBACK_KEYS.has(key)) errors.push(`${key}: unknown key`);
  }

  // files_changed: a non-empty list of the files the change touched.
  if (isAbsent(obj.files_changed)) {
    errors.push('files_changed: required');
  } else if (!Array.isArray(obj.files_changed) || obj.files_changed.length === 0) {
    errors.push('files_changed: must be a non-empty list of changed files');
  }

  // diffs_per_worker: a non-empty mapping of worker name to that worker's diff.
  if (isAbsent(obj.diffs_per_worker)) {
    errors.push('diffs_per_worker: required');
  } else if (!isObject(obj.diffs_per_worker) || Object.keys(obj.diffs_per_worker).length === 0) {
    errors.push('diffs_per_worker: must be a non-empty object mapping each worker to its diff');
  }

  // whole_change_output: the output of exercising the whole change, together.
  if (isAbsent(obj.whole_change_output)) {
    errors.push('whole_change_output: required');
  } else if (typeof obj.whole_change_output !== 'string' || obj.whole_change_output.trim() === '') {
    errors.push('whole_change_output: must be a non-empty string');
  }

  // deliverable_paths: required, but a hand-back with no deliverable is valid, so
  // an empty list is accepted.
  if (isAbsent(obj.deliverable_paths)) {
    errors.push('deliverable_paths: required (may be an empty list)');
  } else if (!Array.isArray(obj.deliverable_paths)) {
    errors.push('deliverable_paths: must be a list (may be empty)');
  }

  // gate_evidence: a reference to an existing artifact (a path the tool can
  // statSync), not fresh inline command output. Presence and existence only; the
  // tool cannot and does not judge whether the run it names actually passed.
  if (isAbsent(obj.gate_evidence)) {
    errors.push('gate_evidence: required');
  } else if (typeof obj.gate_evidence !== 'string' || obj.gate_evidence.trim() === '') {
    errors.push('gate_evidence: must be a non-empty reference to an existing artifact (the worker\'s recorded run), not inline command output');
  } else if (statOrNull(obj.gate_evidence) === null) {
    errors.push(`gate_evidence: "${obj.gate_evidence}" does not resolve to an existing artifact; cite the worker's recorded run, not fresh inline output`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { ...obj } };
}

/**
 * Render a validated hand-back for delivery. Opens with an A2A: attribution so
 * the orchestrator reads it as agent-to-agent traffic, then one line per field.
 */
export function formatHandback(hb) {
  const deliverables = hb.deliverable_paths.length > 0 ? hb.deliverable_paths.join(', ') : '(none)';
  return [
    'A2A: meta hand-back',
    '',
    `files_changed: ${hb.files_changed.join(', ')}`,
    `diffs_per_worker: ${JSON.stringify(hb.diffs_per_worker)}`,
    `gate_evidence: ${hb.gate_evidence}`,
    `whole_change_output: ${hb.whole_change_output}`,
    `deliverable_paths: ${deliverables}`,
  ].join('\n');
}

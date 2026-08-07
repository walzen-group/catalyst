// Load and validate a test's test.yaml into a normalized spec object.
// Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseYaml } from './yaml.mjs';

export const CONFIG_SOURCES = ['declared', 'live', 'both'];
export const CRITERION_KINDS = ['semantic', 'deterministic'];
export const MANDATE_MODES = ['injected', 'caller_owned'];

// The harnesses an actor model may be launched with. Keys are the vocabulary
// models.yaml uses for `runtime:` and the prefixes an `actor.models` entry may
// carry (`<harness>:<model>`); each value lists the model-name prefixes that
// harness owns, which is how a bare entry gets a harness. Routing matters:
// claude-opus-4-8 launched as an omp agent (opencode-zen) dies on a provider
// 401 CreditsError in about ten seconds, so every claude-* model belongs to
// claude-code.
export const RUNTIMES = {
  'claude-code': ['claude-', 'claude', 'sonnet', 'opus', 'haiku'],
  omp: [],
};
export const DEFAULT_RUNTIME = 'omp';

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/** The harness that owns a bare model name, by prefix; omp when nothing claims it. */
export function inferRuntime(model) {
  for (const [runtime, prefixes] of Object.entries(RUNTIMES)) {
    if (prefixes.some((prefix) => model.startsWith(prefix))) return runtime;
  }
  return DEFAULT_RUNTIME;
}

/**
 * Parse one `actor.models` entry into { model, runtime }. The `<harness>:`
 * prefix is optional; present, it must name a known harness, and an unknown one
 * is an error rather than a silent fall-through to the default.
 * @returns {{ok: true, value: {model, runtime}} | {ok: false, error: string}}
 */
export function parseModelEntry(entry) {
  if (!isNonEmptyString(entry)) return { ok: false, error: 'must be a non-empty string' };
  const text = entry.trim();
  const colon = text.indexOf(':');
  if (colon === -1) return { ok: true, value: { model: text, runtime: inferRuntime(text) } };
  const runtime = text.slice(0, colon).trim();
  const model = text.slice(colon + 1).trim();
  if (!Object.prototype.hasOwnProperty.call(RUNTIMES, runtime)) {
    return { ok: false, error: `unknown harness "${runtime}"; known harnesses: ${Object.keys(RUNTIMES).join(', ')}` };
  }
  if (model === '') return { ok: false, error: `"${text}" names a harness but no model` };
  return { ok: true, value: { model, runtime } };
}

/**
 * The `models:` node as a list of entry strings. The block form is a list
 * already; the inline form (`models: [a, b]`) reaches here as one scalar
 * string, because the test.yaml reader carries block sequences only, so it is
 * split here rather than by widening that reader for every value in the file.
 * Null when the node is neither shape.
 */
function modelsList(node) {
  if (Array.isArray(node)) return node;
  if (typeof node === 'string') {
    const text = node.trim();
    if (text.startsWith('[') && text.endsWith(']')) {
      const inner = text.slice(1, -1).trim();
      return inner === '' ? [] : inner.split(',').map((item) => item.trim());
    }
  }
  return null;
}

/**
 * Validate the actor node into { role, model, models[] }. Two spellings: the
 * legacy scalar `model:`, and `models:`, a list of `<harness>:<model>` entries
 * the runner fans out into one run each. A legacy entry carries runtime null,
 * which means the role's own runtime from models.yaml stays in force. `model`
 * stays on the spec as the first entry, so every reader that predates the list
 * keeps working.
 */
function validateActor(node, errors) {
  const empty = (role) => ({ role: role ?? null, model: null, models: [] });
  if (!isObject(node)) {
    errors.push('actor: required, must be a map of role and model (or models)');
    return null;
  }
  const role = node.role;
  if (!isNonEmptyString(role)) errors.push('actor.role: required, non-empty string');

  const hasModel = node.model !== undefined && node.model !== null;
  const hasModels = node.models !== undefined && node.models !== null;
  if (hasModel && hasModels) {
    errors.push('actor: model: and models: are mutually exclusive; name one scalar model or a models list');
    return empty(role);
  }
  if (!hasModel && !hasModels) {
    errors.push('actor.model: required, non-empty string (or actor.models, a list of models)');
    return empty(role);
  }

  if (hasModel) {
    if (!isNonEmptyString(node.model)) {
      errors.push('actor.model: required, non-empty string');
      return empty(role);
    }
    const model = node.model.trim();
    return { role: role ?? null, model, models: [{ model, runtime: null }] };
  }

  const list = modelsList(node.models);
  if (list === null) {
    errors.push('actor.models: must be a list of "<harness>:<model>" entries');
    return empty(role);
  }
  if (list.length === 0) {
    errors.push('actor.models: must name at least one model');
    return empty(role);
  }
  const models = [];
  const seen = new Set();
  list.forEach((entry, i) => {
    const parsed = parseModelEntry(entry);
    if (!parsed.ok) {
      errors.push(`actor.models[${i}]: ${parsed.error}`);
      return;
    }
    if (seen.has(parsed.value.model)) {
      errors.push(`actor.models[${i}]: duplicate model "${parsed.value.model}"`);
      return;
    }
    seen.add(parsed.value.model);
    models.push(parsed.value);
  });
  return { role: role ?? null, model: models[0]?.model ?? null, models };
}

function validateRoleModel(node, label, errors) {
  if (!isObject(node)) {
    errors.push(`${label}: required, must be a map of role and model`);
    return null;
  }
  const role = node.role;
  const model = node.model;
  if (!isNonEmptyString(role)) errors.push(`${label}.role: required, non-empty string`);
  if (!isNonEmptyString(model)) errors.push(`${label}.model: required, non-empty string`);
  return { role: role ?? null, model: model ?? null };
}

function validateStringList(node, label, errors) {
  if (node == null) return [];
  if (!Array.isArray(node)) {
    errors.push(`${label}: must be a list of strings`);
    return [];
  }
  node.forEach((item, i) => {
    if (!isNonEmptyString(item)) errors.push(`${label}[${i}]: must be a non-empty string`);
  });
  return node;
}

function validateCriteria(node, errors) {
  if (!isObject(node)) {
    errors.push('criteria: required, a map of id -> { kind, pass }');
    return [];
  }
  const ids = Object.keys(node);
  if (ids.length === 0) errors.push('criteria: must name at least one criterion');
  const out = [];
  for (const id of ids) {
    const c = node[id];
    if (!isObject(c)) {
      errors.push(`criteria.${id}: must be a map with kind and pass`);
      continue;
    }
    if (!CRITERION_KINDS.includes(c.kind)) {
      errors.push(`criteria.${id}.kind: must be one of ${CRITERION_KINDS.join(', ')}`);
    }
    if (!isNonEmptyString(c.pass)) {
      errors.push(`criteria.${id}.pass: required, a one-sentence pass definition`);
    }
    out.push({ id, kind: c.kind, pass: c.pass });
  }
  return out;
}

/**
 * Validate a parsed test.yaml object into a normalized spec.
 * @returns {{ok: true, value: object} | {ok: false, errors: string[]}}
 */
export function parseTestSpec(obj, slug) {
  const errors = [];
  if (!isObject(obj)) return { ok: false, errors: ['test.yaml: must be a map at the top level'] };

  const actor = validateActor(obj.actor, errors);
  const judge = validateRoleModel(obj.judge, 'judge', errors);

  const configSource = obj.config_source;
  if (!CONFIG_SOURCES.includes(configSource)) {
    errors.push(`config_source: must be one of ${CONFIG_SOURCES.join(', ')}`);
  }

  // Optional dispatch mandate mode: injected (c2d prepends the mandate) or
  // caller_owned (the fixture owns the complete prompt). Absent means the c2d
  // default, injected.
  const mandateMode = obj.mandate_mode ?? null;
  if (mandateMode !== null && !MANDATE_MODES.includes(mandateMode)) {
    errors.push(`mandate_mode: must be one of ${MANDATE_MODES.join(', ')}`);
  }

  const coveredFiles = validateStringList(obj.covered_files, 'covered_files', errors);
  const isolation = validateStringList(obj.isolation, 'isolation', errors);
  const criteria = validateCriteria(obj.criteria, errors);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      slug,
      actor,
      judge,
      config_source: configSource,
      covered_files: coveredFiles,
      isolation,
      criteria,
      ...(mandateMode === null ? {} : { mandate_mode: mandateMode }),
    },
  };
}

export function semanticCriteria(spec) {
  return spec.criteria.filter((c) => c.kind === 'semantic');
}

export function deterministicCriteria(spec) {
  return spec.criteria.filter((c) => c.kind === 'deterministic');
}

/** Read `<testDir>/test.yaml` and validate it; throws with a collected message. */
export function loadTestSpec(testDir, slug) {
  const path = join(testDir, 'test.yaml');
  const text = readFileSync(path, 'utf8');
  const parsed = parseYaml(text, path);
  const result = parseTestSpec(parsed, slug);
  if (!result.ok) {
    throw new Error(`invalid test.yaml (${path}):\n  - ${result.errors.join('\n  - ')}`);
  }
  return result.value;
}

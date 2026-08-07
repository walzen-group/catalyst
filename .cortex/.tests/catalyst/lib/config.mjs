// Shared config loader for the catalyst integration-test suite.
// Reads the role -> model mapping from models.yaml (the machine truth, kept
// alongside the catalyst-v2-model-picking skill) with a tiny hand-rolled reader
// for one constrained grammar only. Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-1-model-config-yaml.md

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// Canonical skills root: the checkout layout at ~/nix/catalyst/skills, which the
// devcontainer bind mirrors at the same path. models.yaml lives beside its skill by
// default; this root is where the default points when it exists.
const SKILLS_ROOT = join(homedir(), 'nix', 'catalyst', 'skills');

/**
 * Default models.yaml path, in resolution order:
 * 1. the CATALYST_MODELS_YAML env override;
 * 2. the model file beside its skill under ~/nix/catalyst/skills, the canonical
 *    skills root, when present;
 * 3. the suite-relative walk-up to a kit-repo checkout (skills
 *    layout), the fallback outside the devcontainer.
 * Read at call time so a test can set the env var per case.
 */
export function defaultModelsPath() {
  const override = process.env.CATALYST_MODELS_YAML;
  if (override && override !== '') return override;
  const alongsideSkill = join(SKILLS_ROOT, 'catalyst-v2-model-picking', 'models.yaml');
  if (existsSync(alongsideSkill)) return alongsideSkill;
  return suiteRelativeModelsPath();
}

/**
 * Kit-repo checkout fallback: resolve relative to the suite directory
 * (.cortex/.tests/catalyst/), walking up to the kit root that holds both
 * .cortex/ and skills/.
 */
export function suiteRelativeModelsPath() {
  // HERE is .cortex/.tests/catalyst/lib; suite dir is its parent; the kit root
  // is three levels above the suite dir (catalyst -> .tests -> .cortex -> root).
  const suiteDir = resolve(HERE, '..');
  const kitRoot = resolve(suiteDir, '..', '..', '..');
  return join(kitRoot, 'skills', 'catalyst-v2-model-picking', 'models.yaml');
}

function fail(path, lineNo, message) {
  const where = lineNo == null ? path : `${path}:${lineNo}`;
  throw new Error(`models.yaml parse error (${where}): ${message}`);
}

// Strip a trailing " # comment"; a line whose first non-space char is # is whole-line.
function stripComment(line) {
  if (/^\s*#/.test(line)) return '';
  return line.replace(/\s+#.*$/, '');
}

/**
 * Parse the constrained grammar into { roleKey: { runtime, model, effort|thinking, when } }.
 * Rejects tabs, odd indentation, lists, anchors, multiline scalars, unknown top-level
 * keys, and depth beyond the roles -> role -> field shape.
 */
export function parseModelsYaml(text, path = '<string>') {
  const roles = {};
  let sawRoles = false;
  let currentRole = null;
  const lines = text.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx];
    const lineNo = idx + 1;
    if (raw.includes('\t')) fail(path, lineNo, 'tabs are not allowed; use 2-space indent');

    const content = stripComment(raw);
    if (content.trim() === '') continue;

    const indent = content.length - content.replace(/^ +/, '').length;
    if (indent % 2 !== 0) fail(path, lineNo, `indent must be a multiple of 2, got ${indent}`);
    const body = content.slice(indent);

    if (body.startsWith('- ')) fail(path, lineNo, 'list syntax is not allowed');
    if (/^[&*|>[{]/.test(body)) fail(path, lineNo, 'anchors, multiline, and flow syntax are not allowed');

    const colon = body.indexOf(':');
    if (colon === -1) fail(path, lineNo, 'expected key: value');
    const key = body.slice(0, colon).trim();
    const value = body.slice(colon + 1).trim();
    if (key === '') fail(path, lineNo, 'empty key');
    if (/[&*|>[{]/.test(value)) fail(path, lineNo, 'anchors, multiline, and flow values are not allowed');

    if (indent === 0) {
      if (key !== 'roles') fail(path, lineNo, `unknown top-level key "${key}"; only roles: is allowed`);
      if (value !== '') fail(path, lineNo, 'roles: must be a map, not a scalar');
      if (sawRoles) fail(path, lineNo, 'duplicate roles: block');
      sawRoles = true;
      currentRole = null;
    } else if (indent === 2) {
      if (!sawRoles) fail(path, lineNo, 'role entry appears before the roles: map');
      if (value !== '') fail(path, lineNo, `role "${key}" must be a map of fields, not a scalar`);
      if (Object.prototype.hasOwnProperty.call(roles, key)) fail(path, lineNo, `duplicate role "${key}"`);
      roles[key] = {};
      currentRole = key;
    } else if (indent === 4) {
      if (currentRole === null) fail(path, lineNo, 'field appears outside a role');
      if (value === '') fail(path, lineNo, `field "${key}" has an empty value`);
      if (Object.prototype.hasOwnProperty.call(roles[currentRole], key)) {
        fail(path, lineNo, `duplicate field "${key}" in role "${currentRole}"`);
      }
      roles[currentRole][key] = value;
    } else {
      fail(path, lineNo, `unexpected indent ${indent}; grammar is roles -> role -> field`);
    }
  }

  if (!sawRoles) fail(path, null, 'no roles: map found');
  if (Object.keys(roles).length === 0) fail(path, null, 'roles: map is empty');

  for (const [role, fields] of Object.entries(roles)) {
    if (!fields.when || fields.when.trim() === '') {
      fail(path, null, `role "${role}" is missing a non-empty when field`);
    }
    if (!fields.model || fields.model.trim() === '') {
      fail(path, null, `role "${role}" is missing a non-empty model field`);
    }
  }

  return roles;
}

/**
 * Load and validate the role table from a models.yaml file. Defaults to the
 * env override or the suite-relative real file when no path is given.
 */
export function loadRoles(yamlPath = defaultModelsPath()) {
  const text = readFileSync(yamlPath, 'utf8');
  return parseModelsYaml(text, yamlPath);
}

/** Return the model string for a role, throwing on an unknown role. */
export function roleModel(roles, roleKey) {
  if (!Object.prototype.hasOwnProperty.call(roles, roleKey)) {
    throw new Error(`unknown role "${roleKey}"; known roles: ${Object.keys(roles).join(', ')}`);
  }
  return roles[roleKey].model;
}

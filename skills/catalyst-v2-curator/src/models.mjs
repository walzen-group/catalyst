// Reads the role -> model mapping from models.yaml, the machine truth kept
// alongside the catalyst-v2-model-picking skill. c2m needs one row, the curator
// model, for the dispatch it hands to c2d. Same grammar the integration-test
// runner reads (a constrained roles -> role -> field block map), ported here so
// the curator skill carries no cross-skill runtime dependency. Zero deps, Node ESM.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// Canonical skills root: the checkout layout at ~/nix/catalyst/skills, which the
// devcontainer bind mirrors at the same path. models.yaml lives beside its skill.
const SKILLS_ROOT = join(homedir(), 'nix', 'catalyst', 'skills');

/**
 * Default models.yaml path, in resolution order:
 * 1. the CATALYST_MODELS_YAML env override;
 * 2. the file beside its skill under ~/nix/catalyst/skills, when present;
 * 3. the kit-repo checkout fallback, walking up from this src dir to the kit root.
 * Read at call time so a test can set the env var per case.
 */
export function defaultModelsPath(env = process.env) {
  const override = env.CATALYST_MODELS_YAML;
  if (override && override !== '') return override;
  const alongsideSkill = join(SKILLS_ROOT, 'catalyst-v2-model-picking', 'models.yaml');
  if (existsSync(alongsideSkill)) return alongsideSkill;
  // HERE is skills/catalyst-v2-curator/src; the catalyst repo root is three levels up.
  const kitRoot = join(HERE, '..', '..', '..');
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
    if (!fields.model || fields.model.trim() === '') {
      fail(path, null, `role "${role}" is missing a non-empty model field`);
    }
  }

  return roles;
}

/** Return the model string for a role, throwing on an unknown role. */
export function roleModel(roles, roleKey) {
  if (!Object.prototype.hasOwnProperty.call(roles, roleKey)) {
    throw new Error(`unknown role "${roleKey}"; known roles: ${Object.keys(roles).join(', ')}`);
  }
  return roles[roleKey].model;
}

/** Load a models.yaml file and return the curator role's model string. */
export function curatorModel(yamlPath = defaultModelsPath()) {
  const roles = parseModelsYaml(readFileSync(yamlPath, 'utf8'), yamlPath);
  return roleModel(roles, 'curator');
}

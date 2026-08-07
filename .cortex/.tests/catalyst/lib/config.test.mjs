// Loader tests plus a one-time migration-coverage check for models.yaml.
// node --test, zero runtime deps.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-1-model-config-yaml.md

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { defaultModelsPath, loadRoles, parseModelsYaml, roleModel, suiteRelativeModelsPath } from './config.mjs';

const TMP = mkdtempSync(join(tmpdir(), 'catalyst-models-'));
let fixtureSeq = 0;
function fixture(text) {
  fixtureSeq += 1;
  const path = join(TMP, `fixture-${fixtureSeq}.yaml`);
  writeFileSync(path, text);
  return path;
}

// Save/restore the env override so path-resolution cases do not leak.
function withoutEnv(fn) {
  const saved = process.env.CATALYST_MODELS_YAML;
  delete process.env.CATALYST_MODELS_YAML;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.CATALYST_MODELS_YAML;
    else process.env.CATALYST_MODELS_YAML = saved;
  }
}

// The eight roles the real models.yaml declares, with their model strings.
const EXPECTED_ROLES = {
  'orchestrator-default': 'kimi-code/k3',
  'orchestrator-claude-code': 'claude-opus-4-8',
  'chat-layer': 'opencode-go/deepseek-v4-flash',
  'implementation-frontier': 'claude-opus-4-8',
  'implementation-mid': 'opencode-go/deepseek-v4-flash',
  'meta-agent': 'opencode-go/deepseek-v4-flash',
  'board-keeper': 'sonnet',
  judge: 'claude-opus-4-8',
};

test('loadRoles parses the real models.yaml and returns every expected role', () => {
  const roles = withoutEnv(() => loadRoles());
  for (const [key, model] of Object.entries(EXPECTED_ROLES)) {
    assert.ok(Object.prototype.hasOwnProperty.call(roles, key), `role ${key} present`);
    assert.equal(roleModel(roles, key), model, `role ${key} model`);
    assert.ok(roles[key].when && roles[key].when.trim() !== '', `role ${key} has a when`);
    assert.ok(roles[key].runtime, `role ${key} has a runtime`);
  }
});

test('roleModel throws on an unknown role', () => {
  const roles = withoutEnv(() => loadRoles());
  assert.throws(() => roleModel(roles, 'no-such-role'), /unknown role/);
});

test('a valid in-memory table round-trips', () => {
  const roles = parseModelsYaml(
    ['roles:', '  solo:', '    runtime: omp', '    model: m/x', '    thinking: high', '    when: only role'].join('\n'),
  );
  assert.deepEqual(roles, { solo: { runtime: 'omp', model: 'm/x', thinking: 'high', when: 'only role' } });
});

// --- malformed fixtures throw ---

test('bad indentation throws', () => {
  const path = fixture(['roles:', '   solo:', '    model: m/x', '    when: x'].join('\n'));
  assert.throws(() => loadRoles(path), /indent/);
});

test('unknown nesting depth throws', () => {
  const path = fixture(
    ['roles:', '  solo:', '    model: m/x', '    when: x', '      deeper: nope'].join('\n'),
  );
  assert.throws(() => loadRoles(path), /indent/);
});

test('list syntax throws', () => {
  const path = fixture(['roles:', '  solo:', '    model: m/x', '    when: x', '    - item'].join('\n'));
  assert.throws(() => loadRoles(path), /list syntax/);
});

test('unknown top-level key throws', () => {
  const path = fixture(['bogus:', '  solo:', '    model: m/x', '    when: x'].join('\n'));
  assert.throws(() => loadRoles(path), /unknown top-level key/);
});

test('anchor syntax throws', () => {
  const path = fixture(['roles:', '  solo:', '    model: &anchor m/x', '    when: x'].join('\n'));
  assert.throws(() => loadRoles(path), /anchors/);
});

test('tabs throw', () => {
  const path = fixture(['roles:', '\tsolo:', '    model: m/x', '    when: x'].join('\n'));
  assert.throws(() => loadRoles(path), /tab/);
});

// --- when field required ---

test('a role missing its when field throws', () => {
  const path = fixture(['roles:', '  solo:', '    runtime: omp', '    model: m/x'].join('\n'));
  assert.throws(() => loadRoles(path), /when/);
});

test('a role with an empty when throws', () => {
  const path = fixture(['roles:', '  solo:', '    model: m/x', '    when:   '].join('\n'));
  // An empty value is rejected as an empty field before the when check; either way it throws.
  assert.throws(() => loadRoles(path), /empty value|when/);
});

// --- path resolution ---

test('the CATALYST_MODELS_YAML env override points the loader at a fixture', () => {
  const path = fixture(
    ['roles:', '  solo:', '    runtime: omp', '    model: fixture/model', '    when: fixture role'].join('\n'),
  );
  const saved = process.env.CATALYST_MODELS_YAML;
  process.env.CATALYST_MODELS_YAML = path;
  try {
    assert.equal(defaultModelsPath(), path);
    const roles = loadRoles();
    assert.deepEqual(Object.keys(roles), ['solo']);
    assert.equal(roleModel(roles, 'solo'), 'fixture/model');
  } finally {
    if (saved === undefined) delete process.env.CATALYST_MODELS_YAML;
    else process.env.CATALYST_MODELS_YAML = saved;
  }
});

test('the default resolves to the models.yaml beside the skill under ~/nix/catalyst/skills', () => {
  withoutEnv(() => {
    const path = defaultModelsPath();
    assert.equal(
      path,
      join(homedir(), 'nix', 'catalyst', 'skills', 'catalyst-v2-model-picking', 'models.yaml'),
      `default path is the alongside-skill file, got ${path}`,
    );
    const roles = loadRoles();
    assert.ok(Object.prototype.hasOwnProperty.call(roles, 'orchestrator-default'));
  });
});

test('the suite-relative fallback still points at the kit-repo skills layout', () => {
  withoutEnv(() => {
    const path = suiteRelativeModelsPath();
    assert.ok(
      path.endsWith(join('skills', 'catalyst-v2-model-picking', 'models.yaml')),
      `fallback path ends at the kit-repo skills layout, got ${path}`,
    );
  });
});

// --- one-time migration coverage ---
//
// Transcribed from the pre-migration SKILL.md model table (this task's diff).
// Every catalyst role the table named must appear in models.yaml with the
// identical model string. The four distinct model strings are the policy-exact
// forms (claude-opus-4-8, not the table's typo'd claude-opus-4.8). This is a
// one-time move check, not an ongoing drift guard: after migration models.yaml
// is the only home of the mapping.
test('migration coverage: every pre-migration role migrated with its model string', () => {
  const roles = withoutEnv(() => loadRoles());

  // Named catalyst dispatch roles from the pre-migration table -> yaml role key.
  // "Implementation delegates" split into frontier/mid; "Small/fast (omp)" folds
  // into implementation-mid (identical model + thinking).
  const preMigration = {
    'Orchestrator (default)': ['orchestrator-default', 'kimi-code/k3'],
    'Orchestrator (Claude Code)': ['orchestrator-claude-code', 'claude-opus-4-8'],
    'Chat layer (quickchat)': ['chat-layer', 'opencode-go/deepseek-v4-flash'],
    'Implementation delegates (frontier)': ['implementation-frontier', 'claude-opus-4-8'],
    'Implementation delegates (mid-tier)': ['implementation-mid', 'opencode-go/deepseek-v4-flash'],
    'Small/fast (omp)': ['implementation-mid', 'opencode-go/deepseek-v4-flash'],
    'Meta-agent': ['meta-agent', 'opencode-go/deepseek-v4-flash'],
    'Board keeper': ['board-keeper', 'sonnet'],
  };
  for (const [label, [key, model]] of Object.entries(preMigration)) {
    assert.ok(Object.prototype.hasOwnProperty.call(roles, key), `${label} -> role ${key} present`);
    assert.equal(roleModel(roles, key), model, `${label} keeps model ${model}`);
  }

  // The two omp-internal modelRoles from the table (plan/designer, smol/tiny) are
  // configured in settings/omp/agent/config.yml, not dispatched by catalyst; their model
  // strings must still survive in the migrated set so nothing was lost.
  const models = new Set(Object.values(roles).map((r) => r.model));
  assert.ok(models.has('kimi-code/k3'), 'omp plan/designer model kimi-code/k3 survives');
  assert.ok(models.has('opencode-go/deepseek-v4-flash'), 'omp smol/tiny model deepseek-v4-flash survives');
});

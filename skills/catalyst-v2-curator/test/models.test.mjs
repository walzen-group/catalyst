// c2m reads the curator model from models.yaml, the same machine-truth file the
// integration-test runner reads. This proves the reader resolves the role and
// rejects a malformed file, without coupling to the test suite's own reader.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseModelsYaml, roleModel, curatorModel } from '../src/models.mjs';

function tmp() {
  return mkdtempSync(join(tmpdir(), 'c2m-models-'));
}

test('parseModelsYaml reads a role -> model map', () => {
  const roles = parseModelsYaml(
    'roles:\n  curator:\n    runtime: claude-code\n    model: sonnet\n    when: memory pass\n',
  );
  assert.equal(roles.curator.model, 'sonnet');
  assert.equal(roles.curator.runtime, 'claude-code');
});

test('roleModel returns the model string, throws on an unknown role', () => {
  const roles = parseModelsYaml('roles:\n  curator:\n    model: sonnet\n    when: x\n');
  assert.equal(roleModel(roles, 'curator'), 'sonnet');
  assert.throws(() => roleModel(roles, 'nope'), /unknown role/);
});

test('parseModelsYaml rejects a tab and a bad top-level key', () => {
  assert.throws(() => parseModelsYaml('roles:\n\tcurator:\n'), /tab/);
  assert.throws(() => parseModelsYaml('agents:\n  curator:\n    model: x\n    when: y\n'), /top-level key/);
});

test('curatorModel reads the curator role from a models.yaml path', () => {
  const dir = tmp();
  const path = join(dir, 'models.yaml');
  writeFileSync(
    path,
    'roles:\n  curator:\n    runtime: claude-code\n    model: sonnet\n    when: memory pass\n',
  );
  assert.equal(curatorModel(path), 'sonnet');
});

test('curatorModel reads the real repo models.yaml curator role', () => {
  // The role this task added must resolve through the default path too.
  const repoYaml = new URL('../../catalyst-v2-model-picking/models.yaml', import.meta.url);
  assert.equal(curatorModel(repoYaml.pathname), 'sonnet');
});

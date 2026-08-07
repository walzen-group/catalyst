import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { scaffold } from './scaffold.mjs';
import { parseYaml } from './yaml.mjs';
import { parseTestSpec } from './testspec.mjs';
import { tempSuite } from './fixtures.mjs';

test('new <slug> writes a schema-valid skeleton', () => {
  const suite = tempSuite();
  const { created } = scaffold(suite, 'guarded-rule');
  const testDir = join(suite, 'guarded-rule');
  assert.ok(existsSync(join(testDir, 'test.yaml')));
  assert.ok(existsSync(join(testDir, 'scenario.md')));
  assert.ok(existsSync(join(testDir, 'checks.mjs')));
  assert.ok(existsSync(join(testDir, 'history')));
  assert.equal(created.length, 3);

  // The scaffolded test.yaml parses and validates.
  const spec = parseTestSpec(parseYaml(readFileSync(join(testDir, 'test.yaml'), 'utf8')), 'guarded-rule');
  assert.ok(spec.ok, JSON.stringify(spec.errors));
  assert.ok(spec.value.criteria.length >= 1);
});

test('the scaffolded checks.mjs exports callable check functions', async () => {
  const suite = tempSuite();
  scaffold(suite, 'guarded-rule');
  const mod = await import(join(suite, 'guarded-rule', 'checks.mjs'));
  const result = mod.contaminationScan({ actorReport: 'clean report', transcript: '' });
  assert.equal(typeof result.criterion, 'string');
  assert.equal(typeof result.pass, 'boolean');
});

test('an existing slug is refused rather than overwritten', () => {
  const suite = tempSuite();
  scaffold(suite, 'guarded-rule');
  assert.throws(() => scaffold(suite, 'guarded-rule'), /already exists/);
});

test('an invalid slug is refused', () => {
  const suite = tempSuite();
  assert.throws(() => scaffold(suite, 'Bad Slug!'), /invalid slug/);
});

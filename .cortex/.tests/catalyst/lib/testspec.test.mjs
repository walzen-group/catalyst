import assert from 'node:assert/strict';
import test from 'node:test';

import { parseYaml } from './yaml.mjs';
import {
  parseTestSpec, semanticCriteria, deterministicCriteria, loadTestSpec, parseModelEntry, inferRuntime,
} from './testspec.mjs';
import { MULTI_TEST_YAML, TEST_YAML, tempSuite, writeTestDir } from './fixtures.mjs';

function specFrom(text) {
  return parseTestSpec(parseYaml(text), 'my-slug');
}

test('a well-formed test.yaml validates into a normalized spec', () => {
  const r = specFrom(TEST_YAML);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.value.slug, 'my-slug');
  assert.equal(r.value.actor.role, 'implementation-mid');
  assert.equal(r.value.judge.model, 'claude-opus-4-8');
  assert.equal(r.value.config_source, 'declared');
  assert.equal(r.value.criteria.length, 2);
});

test('semantic and deterministic criteria split by kind', () => {
  const { value } = specFrom(TEST_YAML);
  assert.deepEqual(semanticCriteria(value).map((c) => c.id), ['c1']);
  assert.deepEqual(deterministicCriteria(value).map((c) => c.id), ['c2']);
});

test('an unknown config_source is rejected', () => {
  const r = specFrom(TEST_YAML.replace('config_source: declared', 'config_source: sometimes'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /config_source/.test(e)));
});

test('mandate_mode parses when present and stays absent when omitted', () => {
  const absent = specFrom(TEST_YAML);
  assert.equal('mandate_mode' in absent.value, false, 'an omitted mode leaves the spec silent, c2d defaults apply');
  const owned = specFrom(`${TEST_YAML}mandate_mode: caller_owned\n`);
  assert.equal(owned.ok, true, owned.ok ? '' : owned.errors.join('; '));
  assert.equal(owned.value.mandate_mode, 'caller_owned');
  const injected = specFrom(`${TEST_YAML}mandate_mode: injected\n`);
  assert.equal(injected.value.mandate_mode, 'injected');
});

test('an unknown mandate_mode is rejected', () => {
  const r = specFrom(`${TEST_YAML}mandate_mode: replay\n`);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /mandate_mode/.test(e)));
});

test('a criterion with an unknown kind is rejected', () => {
  const r = specFrom(TEST_YAML.replace('kind: semantic', 'kind: vibes'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /kind/.test(e)));
});

test('a missing actor model is rejected', () => {
  const r = specFrom(TEST_YAML.replace('  model: opencode-go/deepseek-v4-flash\n', '', 1));
  assert.equal(r.ok, false);
});

test('an actor models list parses with the harness prefix, and infers it without one', () => {
  const r = specFrom(MULTI_TEST_YAML);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.deepEqual(r.value.actor.models, [
    { model: 'opencode-go/deepseek-v4-flash', runtime: 'omp' },
    { model: 'sonnet', runtime: 'claude-code' },
  ]);
  // The bare form infers: a claude-* model belongs to claude-code, because an
  // omp launch of it dies on a provider 401.
  const bare = specFrom(MULTI_TEST_YAML.replace(
    'models: [omp:opencode-go/deepseek-v4-flash, claude-code:sonnet]',
    'models: [opencode-go/deepseek-v4-flash, claude-opus-4-8]',
  ));
  assert.ok(bare.ok, JSON.stringify(bare.errors));
  assert.deepEqual(bare.value.actor.models.map((m) => m.runtime), ['omp', 'claude-code']);
  assert.equal(inferRuntime('claude-opus-4-8'), 'claude-code');
  assert.equal(inferRuntime('opencode-go/deepseek-v4-flash'), 'omp');
  assert.equal(parseModelEntry('nope:some-model').ok, false, 'an unknown harness is refused');
});

test('the models list also parses in the block form, and every entry keeps its harness', () => {
  const block = TEST_YAML.replace(
    '  model: opencode-go/deepseek-v4-flash\n',
    '  models:\n    - omp:opencode-go/deepseek-v4-flash\n    - claude-code:sonnet\n',
  );
  const r = specFrom(block);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.deepEqual(r.value.actor.models.map((m) => `${m.runtime}:${m.model}`), [
    'omp:opencode-go/deepseek-v4-flash',
    'claude-code:sonnet',
  ]);
});

test('a legacy scalar model still validates and normalizes to a one-entry list', () => {
  const r = specFrom(TEST_YAML);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.value.actor.model, 'opencode-go/deepseek-v4-flash');
  // Runtime null: the role's own runtime from models.yaml stays in force, which
  // is what a legacy test.yaml has always meant.
  assert.deepEqual(r.value.actor.models, [{ model: 'opencode-go/deepseek-v4-flash', runtime: null }]);
});

test('actor.model and actor.models together are refused', () => {
  const both = TEST_YAML.replace(
    '  model: opencode-go/deepseek-v4-flash\n',
    '  model: opencode-go/deepseek-v4-flash\n  models: [claude-code:sonnet]\n',
  );
  const r = specFrom(both);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /mutually exclusive/.test(e)), JSON.stringify(r.errors));
});

test('a duplicate model in the list is refused', () => {
  const r = specFrom(MULTI_TEST_YAML.replace('claude-code:sonnet', 'omp:opencode-go/deepseek-v4-flash'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /duplicate model/.test(e)), JSON.stringify(r.errors));
});

test('an empty models list is refused', () => {
  const r = specFrom(MULTI_TEST_YAML.replace(/models: \[.*\]/, 'models: []'));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /at least one model/.test(e)), JSON.stringify(r.errors));
});

test('loadTestSpec reads and validates a test directory', () => {
  const suite = tempSuite();
  const testDir = writeTestDir(suite, 'guarded-rule');
  const spec = loadTestSpec(testDir, 'guarded-rule');
  assert.equal(spec.slug, 'guarded-rule');
  assert.equal(spec.criteria.length, 2);
});

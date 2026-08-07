import assert from 'node:assert/strict';
import test from 'node:test';

import { parseYaml } from './yaml.mjs';
import { parseTestSpec } from './testspec.mjs';
import { resolveRuns, runSuffix } from './resolve.mjs';
import { MULTI_TEST_YAML, ROLES, TEST_YAML } from './fixtures.mjs';

function specFromText(text) {
  const r = parseTestSpec(parseYaml(text), 'slug');
  assert.ok(r.ok, JSON.stringify(r.errors));
  return r.value;
}

function spec(overrides = '') {
  const text = overrides ? TEST_YAML.replace('config_source: declared', `config_source: ${overrides}`) : TEST_YAML;
  const r = parseTestSpec(parseYaml(text), 'slug');
  assert.ok(r.ok, JSON.stringify(r.errors));
  return r.value;
}

test('config_source declared -> one run on the declared model', () => {
  const r = resolveRuns(spec('declared'), ROLES);
  assert.ok(r.ok);
  assert.equal(r.runs.length, 1);
  assert.equal(r.runs[0].side, 'declared');
  assert.equal(r.runs[0].actorModel, 'opencode-go/deepseek-v4-flash');
});

test('config_source live -> one run on the live model from models.yaml', () => {
  const roles = { ...ROLES, 'implementation-mid': { ...ROLES['implementation-mid'], model: 'opencode-go/deepseek-v5' } };
  const r = resolveRuns(spec('live'), roles);
  assert.ok(r.ok);
  assert.equal(r.runs.length, 1);
  assert.equal(r.runs[0].actorModel, 'opencode-go/deepseek-v5');
});

test('config_source both with declared == live -> one run', () => {
  const r = resolveRuns(spec('both'), ROLES);
  assert.ok(r.ok);
  assert.equal(r.runs.length, 1);
});

test('config_source both with actor models differing -> two actor runs', () => {
  const roles = { ...ROLES, 'implementation-mid': { ...ROLES['implementation-mid'], model: 'opencode-go/deepseek-v5' } };
  const r = resolveRuns(spec('both'), roles);
  assert.ok(r.ok);
  assert.equal(r.runs.length, 2);
  assert.deepEqual(r.runs.map((run) => run.side), ['declared', 'live']);
  assert.deepEqual(r.runs.map((run) => run.actorModel), ['opencode-go/deepseek-v4-flash', 'opencode-go/deepseek-v5']);
});

test('a judge model equal to the actor model is refused', () => {
  // Same-model collision on the declared side: both come from test.yaml.
  const collided = parseTestSpec(
    parseYaml(TEST_YAML.replace('  model: claude-opus-4-8', '  model: opencode-go/deepseek-v4-flash')),
    'slug',
  ).value;
  const r = resolveRuns(collided, ROLES);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /distinct from the actor/.test(e)));
});

test('two actor models produce two runs, in order, each on its own harness and suffix', () => {
  const r = resolveRuns(specFromText(MULTI_TEST_YAML), ROLES);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.runs.length, 2);
  assert.deepEqual(r.runs.map((run) => run.actorModel), ['opencode-go/deepseek-v4-flash', 'sonnet']);
  assert.deepEqual(r.runs.map((run) => run.actorRuntime), ['omp', 'claude-code']);
  assert.deepEqual(r.runs.map((run) => run.idSuffix), [
    '-omp-opencode-go-deepseek-v4-flash',
    '-claude-code-sonnet',
  ]);
  // One judge serves both runs.
  assert.deepEqual(new Set(r.runs.map((run) => run.judgeModel)), new Set(['claude-opus-4-8']));
});

test('a single actor model carries no suffix, so existing history ids do not churn', () => {
  const r = resolveRuns(specFromText(TEST_YAML), ROLES);
  assert.ok(r.ok);
  assert.deepEqual(r.runs.map((run) => run.idSuffix), ['']);
  // A one-entry models list is a single-model test too.
  const one = resolveRuns(specFromText(MULTI_TEST_YAML.replace(', claude-code:sonnet', '')), ROLES);
  assert.deepEqual(one.runs.map((run) => run.idSuffix), ['']);
});

test('a legacy actor model runs on the role runtime from models.yaml', () => {
  const r = resolveRuns(specFromText(TEST_YAML), ROLES);
  assert.equal(r.runs[0].actorRuntime, ROLES['implementation-mid'].runtime);
});

test('a judge colliding with any one model in the list refuses the whole test', () => {
  // The second entry is the judge's own model; the first is fine.
  const collided = MULTI_TEST_YAML.replace('claude-code:sonnet', 'claude-code:claude-opus-4-8');
  const r = resolveRuns(specFromText(collided), ROLES);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /distinct from the actor/.test(e)), JSON.stringify(r.errors));
});

test('runSuffix is a filesystem-safe slug of harness and model', () => {
  assert.equal(runSuffix({ runtime: 'claude-code', model: 'claude-opus-4-8' }), '-claude-code-claude-opus-4-8');
  assert.doesNotMatch(runSuffix({ runtime: 'omp', model: 'opencode-go/deepseek-v4-flash' }), /[/:.]/);
});

test('config_source live ignores the declared models list and runs the live config once', () => {
  const r = resolveRuns(specFromText(MULTI_TEST_YAML.replace('config_source: declared', 'config_source: live')), ROLES);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.runs.length, 1);
  assert.equal(r.runs[0].side, 'live');
  assert.equal(r.runs[0].actorModel, 'opencode-go/deepseek-v4-flash');
});

test('an unknown role is refused', () => {
  const roles = { judge: ROLES.judge };
  const r = resolveRuns(spec('declared'), roles);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /not defined in models\.yaml/.test(e)));
});

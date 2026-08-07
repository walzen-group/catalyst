import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import { buildDispatchInput, capabilityFor, deliveredBriefText, runtimeToCli } from './dispatch.mjs';
import { ROLES } from './fixtures.mjs';

// Canonical skills root, mirroring config.mjs.
const SKILLS_ROOT = join(homedir(), 'nix', 'settings', 'skills');
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a file under the catalyst-v2-dispatch skill: alongside-skill under
 * ~/nix/catalyst/skills first, then the suite-relative walk-up to a kit-repo checkout
 * (skills layout), matching defaultModelsPath in config.mjs.
 */
function resolveDispatchPath(rel) {
  const alongside = join(SKILLS_ROOT, 'catalyst-v2-dispatch', rel);
  if (existsSync(alongside)) return alongside;
  const suiteDir = resolve(HERE, '..');
  const kitRoot = resolve(suiteDir, '..', '..', '..');
  return join(kitRoot, 'settings', 'skills', 'catalyst-v2-dispatch', rel);
}

// Read-only import of the dispatch tool's own test helpers (proves they are
// reachable and unmodified; gate (2) re-runs that suite). rig() gives a temp dir
// plus an env; the fake-herdr binary is never spawned here because dry-run
// validates without any launch, and the roster comes from the JSON seam.
const { rig, FAKE_HERDR } = await import(pathToFileURL(resolveDispatchPath('test/helpers/harness.mjs')).href);

const C2D = resolveDispatchPath('c2d');

test('runtimeToCli maps models.yaml runtimes to c2d cli values', () => {
  assert.equal(runtimeToCli('claude-code'), 'claude');
  assert.equal(runtimeToCli('omp'), 'omp');
});

test('capabilityFor uses thinking for omp and omits a claude default effort', () => {
  assert.deepEqual(capabilityFor(ROLES['implementation-mid']), { cli: 'omp', thinking: 'max' });
  assert.deepEqual(capabilityFor(ROLES.judge), { cli: 'claude' });
});

test('the built dispatch input names the resolved model, cwd, and kind unit', () => {
  const input = buildDispatchInput({
    dispatchId: 'test-x-declared-actor',
    name: 'x-actor',
    cwd: '/some/test/dir',
    model: 'opencode-go/deepseek-v4-flash',
    roleEntry: ROLES['implementation-mid'],
    briefText: 'do the task',
  });
  // Strict-JSON round trip: the document is plain data.
  assert.deepEqual(JSON.parse(JSON.stringify(input)), input);
  const agent = input.agents[0];
  assert.equal(agent.model, 'opencode-go/deepseek-v4-flash');
  assert.equal(agent.cwd, '/some/test/dir');
  assert.equal(agent.cli, 'omp');
  assert.equal(agent.thinking, 'max');
  assert.equal(agent.kind, 'unit');
  assert.equal(agent.brief.mode, 'inline');
});

test('buildDispatchInput forwards mandate_mode when given and omits it when absent', () => {
  const base = {
    dispatchId: 'test-x-declared-actor',
    name: 'x-actor',
    cwd: '/some/test/dir',
    model: 'opencode-go/deepseek-v4-flash',
    roleEntry: ROLES['implementation-mid'],
    briefText: 'do the task',
  };
  const plain = buildDispatchInput(base);
  assert.equal('mandate_mode' in plain, false, 'an absent mode stays omitted; c2d defaults to injected');
  const owned = buildDispatchInput({ ...base, mandateMode: 'caller_owned' });
  assert.equal(owned.mandate_mode, 'caller_owned');
  assert.equal(owned.agents[0].brief.text, 'do the task');
});

test('deliveredBriefText reads the recorded brief off the dispatch result document', () => {
  const doc = JSON.stringify({
    status: 'ok',
    agents: [{ name: 'x-actor', brief_text_delivered: 'THE DELIVERED BRIEF' }],
  });
  assert.equal(deliveredBriefText(doc, 'x-actor'), 'THE DELIVERED BRIEF');
  assert.equal(deliveredBriefText('not json', 'x-actor'), null);
  assert.equal(deliveredBriefText(JSON.stringify({ agents: [] }), 'x-actor'), null);
});

// A live agent's real CLI is the only launch path. These two cases feed the
// runner-built JSON to the REAL c2d dispatch --dry-run (no herdr, no agent: the
// roster comes from the JSON seam) to prove the document is well-formed and that
// kind: "unit" is what exempts it from the worker-needs-meta refusal.
function dryRun(input, env) {
  return spawnSync(process.execPath, [C2D, 'dispatch', '--dry-run'], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env,
  });
}

test('the real c2d dispatch --dry-run accepts the runner-built unit launch', () => {
  const r = rig();
  const rosterPath = join(r.dir, 'roster.json');
  writeFileSync(rosterPath, JSON.stringify({ result: { agents: [] } }));
  const env = { ...r.env, CATALYST_DISPATCH_ROSTER_JSON: rosterPath };

  const input = buildDispatchInput({
    dispatchId: 'test-x-declared-actor',
    name: 'x-actor',
    cwd: r.dir, // an existing directory, as preflight requires
    model: 'opencode-go/deepseek-v4-flash',
    roleEntry: ROLES['implementation-mid'],
    briefText: 'do the task',
  });

  const res = dryRun(input, env);
  assert.equal(res.status, 0, res.stdout + res.stderr);
  const plan = JSON.parse(res.stdout);
  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.agents[0].model, 'opencode-go/deepseek-v4-flash');
  assert.equal(plan.agents[0].cwd, r.dir);
  assert.equal(plan.agents[0].cli, 'omp');
});

test('the same launch as a worker (kind flipped) is refused for lacking a meta', () => {
  const r = rig();
  const rosterPath = join(r.dir, 'roster.json');
  writeFileSync(rosterPath, JSON.stringify({ result: { agents: [] } }));
  const env = { ...r.env, CATALYST_DISPATCH_ROSTER_JSON: rosterPath };

  const input = buildDispatchInput({
    dispatchId: 'test-x-declared-actor',
    name: 'x-actor',
    cwd: r.dir,
    model: 'opencode-go/deepseek-v4-flash',
    roleEntry: ROLES['implementation-mid'],
    briefText: 'do the task',
  });
  input.agents[0].kind = 'worker';

  const res = dryRun(input, env);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /worker but no meta-agent/);
  // FAKE_HERDR is imported to prove the helper is reachable and unmodified.
  assert.ok(FAKE_HERDR.endsWith('fake-herdr.mjs'));
});

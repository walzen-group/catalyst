// Input surface. dispatch reads its input on stdin only (--file removed by user
// directive 2026-08-02; the throwaway-file misuse is now impossible). steer keeps
// its two-mode surface: inline --text xor --file, where --file is refused unless
// it is a cortex plan/spec doc under a .cortex/ tree.
// Regression anchor: incident 2026-08-01-dispatch-file-surface.

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import { main } from '../src/cli.mjs';
import { preflight, requireCortexDoc, isCortexPath } from '../src/preflight.mjs';
import { OMP_IDLE, OMP_WORKING_GET, rig } from './helpers/harness.mjs';

function tmp(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function dispatchDoc(cwd, overrides = {}) {
  return JSON.stringify({
    dispatch_id: 'cli-test',
    heartbeat_ms: 60000,
    // kind: unit so these input-surface fixtures are valid dispatches under the
    // worker-needs-meta preflight gate; they test the .cortex/stdin surface, not
    // the meta rule.
    agents: [
      { name: 'a', cwd, cli: 'claude', model: 'opus', kind: 'unit', brief: { mode: 'inline', text: 'do it' }, ...overrides },
    ],
  });
}

function capture() {
  let out = '';
  return { io: { out: { write: (c) => { out += c; } }, err: { write: () => {} } }, read: () => out };
}

// --- the .cortex gate ---------------------------------------------------------

test('isCortexPath accepts a .cortex tree and rejects everything else', () => {
  assert.equal(isCortexPath('/workspaces/x/.cortex/plans/p.md'), true);
  assert.equal(isCortexPath('/tmp/p.json'), false);
  assert.equal(isCortexPath('/home/u/plans/p.md'), false);
});

test('requireCortexDoc: cortex file ok; /tmp, non-cortex, missing, dir all refused', () => {
  const base = tmp('catalyst-cli-cortex-');
  const cortexDir = join(base, '.cortex', 'plans');
  mkdirSync(cortexDir, { recursive: true });
  const doc = join(cortexDir, 'task.md');
  writeFileSync(doc, 'spec');

  assert.equal(requireCortexDoc(doc).ok, true);
  assert.equal(requireCortexDoc(join('/tmp', 'x.json')).ok, false);
  const nonCortex = join(base, 'scratch.md');
  writeFileSync(nonCortex, 'x');
  assert.equal(requireCortexDoc(nonCortex).ok, false);
  assert.equal(requireCortexDoc(join(cortexDir, 'missing.md')).ok, false);
  assert.equal(requireCortexDoc(cortexDir).ok, false); // a directory is not a file
});

// --- preflight spec_path ------------------------------------------------------

test('brief.spec_path: under .cortex accepted; outside refused; nonexistent refused', () => {
  const base = tmp('catalyst-cli-spec-');
  const cortexDir = join(base, '.cortex', 'plans');
  mkdirSync(cortexDir, { recursive: true });
  const spec = join(cortexDir, 'task-3.md');
  writeFileSync(spec, 'the spec');

  const agent = (specPath) => ({
    name: 'a', cwd: base, cli: 'claude', model: 'opus', kind: 'unit',
    brief: { mode: 'spec_pointer', spec_path: specPath, text: 'run it' },
  });

  assert.equal(preflight({ agents: [agent(spec)] }, []).ok, true);

  const outside = join(base, 'task-3.md');
  writeFileSync(outside, 'x');
  const refusedOutside = preflight({ agents: [agent(outside)] }, []);
  assert.equal(refusedOutside.ok, false);
  assert.match(refusedOutside.failures.join(' '), /not under a \.cortex\/ tree/);

  const refusedMissing = preflight({ agents: [agent(join(cortexDir, 'nope.md'))] }, []);
  assert.equal(refusedMissing.ok, false);
  assert.match(refusedMissing.failures.join(' '), /does not exist/);
});

// --- dispatch input surface ---------------------------------------------------

test('dispatch prompt mode: inline JSON on stdin works', async () => {
  const cwd = tmp('catalyst-cli-cwd-');
  const c = capture();
  const code = await main(['dispatch', '--dry-run'], {
    ...c.io,
    stdin: Readable.from([dispatchDoc(cwd)]),
    fetchRoster: () => [],
  });
  assert.equal(code, 0, c.read());
  assert.equal(JSON.parse(c.read()).mode, 'dry-run');
});

test('dispatch: --file is rejected — dispatch input is stdin only', async () => {
  // The dispatch input-from-file mode was removed (user directive 2026-08-02).
  // Passing --file, even to a real .cortex doc, is refused with a message naming
  // stdin as the only input source and pointing at brief.spec_path for docs.
  const cwd = tmp('catalyst-cli-nofile-');
  const cortexDir = join(cwd, '.cortex', 'plans');
  mkdirSync(cortexDir, { recursive: true });
  const docPath = join(cortexDir, 'dispatch.json');
  writeFileSync(docPath, dispatchDoc(cwd));

  const c = capture();
  const code = await main(['dispatch', '--file', docPath, '--dry-run'], {
    ...c.io,
    stdin: Readable.from([]),
    fetchRoster: () => [],
  });
  assert.equal(code, 1, c.read());
  const failures = JSON.parse(c.read()).failures.join(' ');
  assert.match(failures, /stdin only/);
  assert.match(failures, /--file was removed/);
  assert.match(failures, /brief\.spec_path/);
});

test('dispatch: brief.spec_path still validates and launches on stdin', async () => {
  // The plan-reference path (spec_pointer / spec_path) is untouched: a spec_pointer
  // brief with a .cortex spec_path still dry-runs clean over inline stdin.
  const cwd = tmp('catalyst-cli-specpath-');
  const cortexDir = join(cwd, '.cortex', 'plans');
  mkdirSync(cortexDir, { recursive: true });
  const spec = join(cortexDir, 'task-3.md');
  writeFileSync(spec, 'the spec');

  const doc = dispatchDoc(cwd, {
    brief: { mode: 'spec_pointer', spec_path: spec, text: 'run it' },
  });
  const c = capture();
  const code = await main(['dispatch', '--dry-run'], {
    ...c.io,
    stdin: Readable.from([doc]),
    fetchRoster: () => [],
  });
  assert.equal(code, 0, c.read());
  assert.equal(JSON.parse(c.read()).agents[0].spec_path, spec);
});

test('dispatch: no stdin input is refused', async () => {
  const neither = capture();
  assert.equal(await main(['dispatch', '--dry-run'], { ...neither.io, stdin: Readable.from(['']), fetchRoster: () => [] }), 1);
  assert.match(JSON.parse(neither.read()).failures.join(' '), /no input/);
});

test('dispatch: a positional input argument is refused', async () => {
  const c = capture();
  const code = await main(['dispatch', 'some/input.json'], { ...c.io, stdin: Readable.from(['']), fetchRoster: () => [] });
  assert.equal(code, 1);
  assert.match(JSON.parse(c.read()).failures.join(' '), /unexpected positional argument/);
});

// --- steer input surface ------------------------------------------------------

test('steer prompt mode: --text is delivered through the tool', async () => {
  const r = rig({ agentGet: OMP_WORKING_GET, reads: [OMP_IDLE], prompt: { status: 0, stdout: '{"result":{}}' } });
  const c = capture();
  const code = await main(['steer', '--agent', 'orchestrator', '--text', 'a directive'], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 0, c.read());
  assert.equal(JSON.parse(c.read()).status, 'ok');
});

test('steer file mode: a .cortex doc is read and delivered', async () => {
  const base = tmp('catalyst-cli-steerfile-');
  const cortexDir = join(base, '.cortex', 'plans');
  mkdirSync(cortexDir, { recursive: true });
  const spec = join(cortexDir, 'follow-up.md');
  writeFileSync(spec, 'Execute the follow-up in this spec.');

  const r = rig({ agentGet: OMP_WORKING_GET, reads: [OMP_IDLE], prompt: { status: 0, stdout: '{"result":{}}' } });
  const c = capture();
  const code = await main(['steer', '--agent', 'orchestrator', '--file', spec], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 0, c.read());
  assert.equal(JSON.parse(c.read()).status, 'ok');
});

test('steer: neither --text nor --file is refused; both is refused', async () => {
  const neither = capture();
  assert.equal(await main(['steer', '--agent', 'x'], neither.io), 1);
  assert.match(JSON.parse(neither.read()).failures.join(' '), /name --text .* or --file/);

  const both = capture();
  assert.equal(await main(['steer', '--agent', 'x', '--text', 'hi', '--file', '/x/.cortex/p.md'], both.io), 1);
  assert.match(JSON.parse(both.read()).failures.join(' '), /not both/);
});

test('steer: --text-file no longer exists, and a /tmp --file is refused', async () => {
  const unknown = capture();
  assert.equal(await main(['steer', '--agent', 'x', '--text-file', '/tmp/p.md'], unknown.io), 1);
  assert.match(JSON.parse(unknown.read()).failures.join(' '), /unknown option/);

  const tmpFile = capture();
  assert.equal(await main(['steer', '--agent', 'x', '--file', '/tmp/p.md'], tmpFile.io), 1);
  assert.match(JSON.parse(tmpFile.read()).failures.join(' '), /not under a \.cortex\/ tree/);
});

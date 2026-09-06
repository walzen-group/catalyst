// Check B: a hand-back completeness schema. `c2d handback --agent <orch> --file
// <.cortex path>` reads a structured JSON payload, refuses it by named field when
// any required field is missing or empty, requires gate_evidence to resolve to an
// existing artifact (the structural nudge against re-running a gate instead of
// citing the worker's recorded run), and on success delivers it through the
// existing steer path with an A2A: attribution.

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { validateHandback, formatHandback, gateInFlightWorkers } from '../src/handback.mjs';
import { resultPath } from '../src/result.mjs';
import { main } from '../src/cli.mjs';
import { OMP_IDLE, OMP_WORKING_GET, rig } from './helpers/harness.mjs';

// steer reads the visible screen once, the composer twice, the omp pre-send hold
// twice, and the consumption read twice: seven quiet reads for a clean delivery.
const OMP_QUIET_READS = [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE];

const evidenceDir = mkdtempSync(join(tmpdir(), 'catalyst-handback-'));
const gateArtifact = join(evidenceDir, 'worker-a-testrun.txt');
writeFileSync(gateArtifact, 'node --test: 42 pass 0 fail\n');

// A complete, well-formed payload. gate_evidence points at a real artifact.
function payload(overrides = {}) {
  return {
    files_changed: ['src/schema.mjs', 'src/preflight.mjs'],
    diffs_per_worker: { 'impl-a': '/tmp/does-not-need-to-exist/diff-a.patch' },
    gate_evidence: gateArtifact,
    whole_change_output: 'node --test: 146 pass 0 fail',
    deliverable_paths: [],
    ...overrides,
  };
}

const REQUIRED = ['files_changed', 'diffs_per_worker', 'gate_evidence', 'whole_change_output', 'deliverable_paths'];

test('a complete, well-formed handback validates', () => {
  const result = validateHandback(payload());
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('; '));
});

test('each required field, when missing, is refused by name', () => {
  for (const field of REQUIRED) {
    const doc = payload();
    delete doc[field];
    const result = validateHandback(doc);
    assert.equal(result.ok, false, `${field} missing should refuse`);
    const failure = result.errors.find((e) => e.startsWith(`${field}:`));
    assert.ok(failure, `expected a refusal naming ${field}: ${result.errors.join('; ')}`);
  }
});

test('an empty value for a required field is refused by name', () => {
  const empties = {
    files_changed: [],
    diffs_per_worker: {},
    gate_evidence: '',
    whole_change_output: '',
  };
  for (const [field, empty] of Object.entries(empties)) {
    const result = validateHandback(payload({ [field]: empty }));
    assert.equal(result.ok, false, `${field} empty should refuse`);
    const failure = result.errors.find((e) => e.startsWith(`${field}:`));
    assert.ok(failure, `expected a refusal naming ${field}: ${result.errors.join('; ')}`);
  }
});

test('deliverable_paths may be an empty list', () => {
  const result = validateHandback(payload({ deliverable_paths: [] }));
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('; '));
});

test('a gate_evidence reference that does not exist is refused, naming the field', () => {
  const result = validateHandback(payload({ gate_evidence: join(evidenceDir, 'no-such-run.txt') }));
  assert.equal(result.ok, false);
  const failure = result.errors.find((e) => e.startsWith('gate_evidence:'));
  assert.ok(failure, `expected a gate_evidence refusal: ${result.errors.join('; ')}`);
});

test('an unknown key is refused', () => {
  const result = validateHandback(payload({ extra: 'nope' }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /extra: unknown key/);
});

test('formatHandback carries an A2A: attribution', () => {
  assert.match(formatHandback(payload()), /A2A:/);
});

// --- delivery through the steer path ------------------------------------------

function writeCortexPayload(doc) {
  const base = mkdtempSync(join(tmpdir(), 'catalyst-handback-cli-'));
  const cortexDir = join(base, '.cortex', 'reports', 'handbacks');
  mkdirSync(cortexDir, { recursive: true });
  const file = join(cortexDir, 'handback.json');
  writeFileSync(file, JSON.stringify(doc));
  return file;
}

function capture() {
  let out = '';
  return { io: { out: { write: (c) => { out += c; } }, err: { write: () => {} } }, read: () => out };
}

test('a complete handback is validated and delivered through steer', async () => {
  const file = writeCortexPayload(payload());
  const r = rig({ agentGet: OMP_WORKING_GET, reads: OMP_QUIET_READS, prompt: { status: 0, stdout: '{"result":{}}' } });
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 0, c.read());
  assert.equal(JSON.parse(c.read()).status, 'ok');
  const prompt = r.calls('agent prompt')[0];
  assert.ok(prompt, 'the handback was delivered via agent prompt');
  assert.match(prompt[3], /A2A:/, 'the delivered text carries an A2A: attribution');
});

test('an incomplete handback file is refused at the CLI, naming the field', async () => {
  const doc = payload();
  delete doc.gate_evidence;
  const file = writeCortexPayload(doc);
  const r = rig({ agentGet: OMP_WORKING_GET, reads: OMP_QUIET_READS, prompt: { status: 0, stdout: '{"result":{}}' } });
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 1, c.read());
  assert.match(JSON.parse(c.read()).failures.join(' '), /gate_evidence:/);
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is delivered when validation fails');
});

test('handback --file outside a .cortex tree is refused', async () => {
  const base = mkdtempSync(join(tmpdir(), 'catalyst-handback-nocortex-'));
  const file = join(base, 'handback.json');
  writeFileSync(file, JSON.stringify(payload()));
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file], { ...c.io });
  assert.equal(code, 1, c.read());
  assert.match(JSON.parse(c.read()).failures.join(' '), /not under a \.cortex\/ tree/);
});

// --- retirement gate: never hand back with a worker still in flight -----------
// A meta retires by delivering its hand-back. Delivery must refuse while any
// worker of the caller's own dispatch reads in flight on the live roster, so a
// meta cannot declare completion over a worker that is still working
// (incident 2026-09-06-wave2-conduct). The caller's dispatch is attributed from
// its herdr pane against the persisted dispatch results.

function rosterAgent(name, status, pane, tab) {
  return {
    name,
    agent_status: status,
    pane_id: pane,
    tab_id: tab,
    cwd: '/home/nixos/repos/kuport',
    agent_session: { agent: 'omp', kind: 'path', source: 'herdr:omp', value: `/tmp/${name}.jsonl` },
    revision: 3,
  };
}

function listReply(agents) {
  return { status: 0, stdout: JSON.stringify({ id: 'cli:agent:list', result: { agents } }) };
}

// One `agent get` reply serves every get in the fake; the pane is deliberately
// NOT the caller's so no entry reads caller_self from the live reply (the
// attribution comes from the persisted dispatch record, not the live pane).
function getReply(status) {
  return {
    status: 0,
    stdout: JSON.stringify({
      id: 'cli:agent:get',
      result: { agent: rosterAgent('any', status, 'wX:p9', 'wX:t9') },
    }),
  };
}

function writeResultRecord(env, dispatchId, agents) {
  const file = resultPath(dispatchId, env);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ dispatch_id: dispatchId, status: 'ok', agents }));
}

test('gateInFlightWorkers names only present workers that are working or blocked', () => {
  const agents = [
    { name: 'meta-wave2', role: 'meta', present: true, status: 'working' },
    { name: 'impl-task4-deploy', role: 'worker', present: true, status: 'working' },
    { name: 'impl-blocked', role: 'worker', present: true, status: 'blocked' },
    { name: 'impl-done', role: 'worker', present: true, status: 'done' },
    { name: 'impl-gone', role: 'worker', present: false, status: 'working' },
    { name: 'impl-self', role: 'worker', caller_self: true, present: true, status: 'working' },
  ];
  assert.deepEqual(gateInFlightWorkers(agents), [
    { name: 'impl-task4-deploy', status: 'working' },
    { name: 'impl-blocked', status: 'blocked' },
  ]);
});

test('handback refuses delivery while a worker of the caller dispatch is in flight', async () => {
  const file = writeCortexPayload(payload());
  const r = rig({
    agentList: listReply([
      rosterAgent('meta-wave2', 'working', 'wT:p1', 'wT:t1'),
      rosterAgent('impl-task4-deploy', 'working', 'wT:p2', 'wT:t2'),
    ]),
    agentGet: getReply('working'),
    reads: OMP_QUIET_READS,
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  r.env.HERDR_PANE_ID = 'wT:p1';
  r.env.HERDR_TAB_ID = 'wT:t1';
  writeResultRecord(r.env, '2026-09-06-kuport-w2', [
    { name: 'meta-wave2', pane_id: 'wT:p1', tab_id: 'wT:t1' },
    { name: 'impl-task4-deploy', pane_id: 'wT:p2', tab_id: 'wT:t2' },
  ]);
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 1, c.read());
  const failures = JSON.parse(c.read()).failures.join(' ');
  assert.match(failures, /impl-task4-deploy/, 'the refusal names the in-flight worker');
  assert.match(failures, /in flight/, 'the refusal names the state');
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is delivered while a worker is in flight');
});

test('handback delivers once every worker of the caller dispatch has settled', async () => {
  const file = writeCortexPayload(payload());
  const r = rig({
    agentList: listReply([
      rosterAgent('meta-wave2', 'done', 'wT:p1', 'wT:t1'),
      rosterAgent('impl-task4-deploy', 'done', 'wT:p2', 'wT:t2'),
    ]),
    agentGet: getReply('done'),
    reads: [...OMP_QUIET_READS, ...OMP_QUIET_READS, ...OMP_QUIET_READS],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  r.env.HERDR_PANE_ID = 'wT:p1';
  r.env.HERDR_TAB_ID = 'wT:t1';
  writeResultRecord(r.env, '2026-09-06-kuport-w2', [
    { name: 'meta-wave2', pane_id: 'wT:p1', tab_id: 'wT:t1' },
    { name: 'impl-task4-deploy', pane_id: 'wT:p2', tab_id: 'wT:t2' },
  ]);
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 0, c.read());
  const doc = JSON.parse(c.read());
  assert.equal(doc.status, 'ok', 'the handback delivers');
  assert.deepEqual(doc.handback_gate.workers_in_flight, [], 'the gate saw no in-flight worker');
  const prompt = r.calls('agent prompt')[0];
  assert.ok(prompt, 'the handback was delivered via agent prompt');
});

test('--allow-in-flight true delivers over an in-flight worker and records the exception', async () => {
  const file = writeCortexPayload(payload());
  const r = rig({
    agentList: listReply([
      rosterAgent('meta-wave2', 'working', 'wT:p1', 'wT:t1'),
      rosterAgent('impl-task4-deploy', 'working', 'wT:p2', 'wT:t2'),
    ]),
    agentGet: getReply('working'),
    reads: OMP_QUIET_READS,
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  r.env.HERDR_PANE_ID = 'wT:p1';
  r.env.HERDR_TAB_ID = 'wT:t1';
  writeResultRecord(r.env, '2026-09-06-kuport-w2', [
    { name: 'meta-wave2', pane_id: 'wT:p1', tab_id: 'wT:t1' },
    { name: 'impl-task4-deploy', pane_id: 'wT:p2', tab_id: 'wT:t2' },
  ]);
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file, '--allow-in-flight', 'true'], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 0, c.read());
  const doc = JSON.parse(c.read());
  assert.equal(doc.status, 'ok');
  assert.equal(doc.handback_gate.overridden, true, 'the override is recorded');
  const prompt = r.calls('agent prompt')[0];
  assert.ok(prompt, 'the handback was delivered via agent prompt');
  assert.match(prompt[3], /WORKERS IN FLIGHT/, 'the delivered text records the exception for the reader');
  assert.match(prompt[3], /impl-task4-deploy/, 'the delivered text names the in-flight worker');
});

test('handback with no attributable dispatch record delivers with a gate note', async () => {
  const file = writeCortexPayload(payload());
  const r = rig({
    agentList: listReply([]),
    agentGet: getReply('working'),
    reads: OMP_QUIET_READS,
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  r.env.HERDR_PANE_ID = 'wZ:p9';
  r.env.HERDR_TAB_ID = 'wZ:t9';
  const c = capture();
  const code = await main(['handback', '--agent', 'orchestrator', '--file', file], {
    ...c.io, options: r.options, env: r.env,
  });
  assert.equal(code, 0, c.read());
  const doc = JSON.parse(c.read());
  assert.equal(doc.status, 'ok');
  assert.equal(doc.handback_gate.attributed, false, 'no dispatch was attributed');
  assert.match(doc.handback_gate.note, /no dispatch record/i, 'the note says the gate could not attribute');
});

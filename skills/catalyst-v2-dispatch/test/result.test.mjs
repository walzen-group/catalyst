// findDispatchForCaller: attributes a hand-back (or any caller-scoped read) to
// the dispatch whose recorded meta-agent runs in the caller's own herdr pane.
// The hand-back retirement gate keys on it, so a meta cannot hand back past a
// worker of its own dispatch still in flight (incident 2026-09-06-wave2-conduct).

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { resultPath, findDispatchForCaller, findDispatcherForCaller } from '../src/result.mjs';
import { runDispatch } from '../src/dispatch.mjs';
import { OMP_IDLE, OMP_WORKING_GET, rig } from './helpers/harness.mjs';

function record(dispatchId, agents) {
  return { dispatch_id: dispatchId, status: 'ok', agents };
}

function writeRecord(env, doc) {
  const file = resultPath(doc.dispatch_id, env);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify(doc));
}

function stateEnv(env = {}) {
  const dir = join(tmpdir(), `catalyst-result-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return { dir, env: { XDG_STATE_HOME: join(dir, 'state'), ...env } };
}

test('returns the dispatch whose meta-agent entry matches the caller pane', () => {
  const { env } = stateEnv({ HERDR_PANE_ID: 'wT:p1', HERDR_TAB_ID: 'wT:t1' });
  writeRecord(env, record('2026-09-06-kuport-w1', [
    { name: 'meta-wave1', pane_id: 'wQ:p1', tab_id: 'wQ:t1' },
  ]));
  writeRecord(env, record('2026-09-06-kuport-w2', [
    { name: 'meta-wave2', pane_id: 'wT:p1', tab_id: 'wT:t1' },
    { name: 'impl-task4-deploy', pane_id: 'wT:p2', tab_id: 'wT:t2' },
  ]));
  const found = findDispatchForCaller(env);
  assert.equal(found.dispatch_id, '2026-09-06-kuport-w2');
  assert.equal(found.name, 'meta-wave2');
});

test('ignores records whose matched entry is not the meta-agent of that dispatch', () => {
  const { env } = stateEnv({ HERDR_PANE_ID: 'wT:p2', HERDR_TAB_ID: 'wT:t2' });
  writeRecord(env, record('2026-09-06-kuport-w2', [
    { name: 'meta-wave2', pane_id: 'wT:p1', tab_id: 'wT:t1' },
    { name: 'impl-task4-deploy', pane_id: 'wT:p2', tab_id: 'wT:t2' },
  ]));
  assert.equal(findDispatchForCaller(env), null, 'a worker pane attributes no dispatch');
});

test('returns null with no herdr ids, no records, or no match', () => {
  const { env: bare } = stateEnv();
  assert.equal(findDispatchForCaller(bare), null);
  const { env: unmatched } = stateEnv({ HERDR_PANE_ID: 'wZ:p9', HERDR_TAB_ID: 'wZ:t9' });
  assert.equal(findDispatchForCaller(unmatched), null);
});

// The dispatcher's roster identity: a dispatch records who launched it, so a
// launched agent can address its hand-back to that session by role (`--agent
// dispatcher`) instead of a literal another effort may own (incident
// 2026-10-28-orchestrator-name-taken-handback-misroute).

const CALLER = { name: 'orch-aio', pane_id: 'wA:p1', tab_id: 'wA:t1', cwd: '/home/nixos/repos/catalyst-aio' };

test('a persisted dispatch result records the caller by its roster name at the caller pane', () => {
  const r = rig({
    tabCreate: { status: 0, stdout: `${JSON.stringify({ result: { tab: { tab_id: 't1' }, root_pane: { pane_id: 'p1', cwd: '/tmp/catalyst-verify-omp' } } })}\n` },
    agentStart: { status: 0, stdout: `${JSON.stringify({ result: { agent: { agent_session: { agent: 'omp', kind: 'path', value: '/tmp/catalyst-verify-omp/session.jsonl' } } } })}\n` },
    agentGet: OMP_WORKING_GET,
    agentList: { status: 0, stdout: JSON.stringify({ result: { agents: [
      { name: 'orchestrator', pane_id: 'wY:p1', tab_id: 'wY:t1', cwd: '/home/nixos/repos/statswatch' },
      { name: CALLER.name, pane_id: CALLER.pane_id, tab_id: CALLER.tab_id, cwd: CALLER.cwd },
    ] } }) },
    reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  r.env.HERDR_PANE_ID = CALLER.pane_id;
  r.env.HERDR_TAB_ID = CALLER.tab_id;
  const input = {
    dispatch_id: 'caller-identity-test',
    heartbeat_ms: 60000,
    agents: [
      { name: 'the-curator', cwd: '/tmp/catalyst-verify-omp', cli: 'omp', model: 'deepseek-v4.1-flash', kind: 'unit', brief: { mode: 'inline', text: 'Run one pass.' } },
    ],
  };
  const out = runDispatch(input, { env: r.env, options: r.options });
  assert.equal(out.document.caller?.name, 'orch-aio', JSON.stringify(out.document.caller));
  assert.equal(out.document.caller.pane_id, CALLER.pane_id);
  assert.equal(out.document.caller.tab_id, CALLER.tab_id);
  const persisted = JSON.parse(readFileSync(out.persisted, 'utf8'));
  assert.equal(persisted.caller?.name, 'orch-aio', 'the persisted record names the dispatcher');
});

test('findDispatcherForCaller returns the recorded caller for a the-curator entry and a meta entry', () => {
  const { env } = stateEnv({ HERDR_PANE_ID: 'wC:p1', HERDR_TAB_ID: 'wC:t1' });
  writeRecord(env, { ...record('housekeeping-1', [{ name: 'the-curator', pane_id: 'wC:p1', tab_id: 'wC:t1' }]), caller: CALLER });
  const curator = findDispatcherForCaller(env);
  assert.equal(curator?.caller?.name, 'orch-aio', 'a non-meta entry still resolves its dispatcher');
  assert.equal(curator.dispatch_id, 'housekeeping-1');

  const { env: metaEnv } = stateEnv({ HERDR_PANE_ID: 'wM:p1', HERDR_TAB_ID: 'wM:t1' });
  writeRecord(metaEnv, { ...record('wave-1', [{ name: 'meta-wave1', pane_id: 'wM:p1', tab_id: 'wM:t1' }]), caller: CALLER });
  assert.equal(findDispatcherForCaller(metaEnv)?.caller?.name, 'orch-aio');
});

test('findDispatcherForCaller reports a matched record with no caller, and null with no match', () => {
  const { env } = stateEnv({ HERDR_PANE_ID: 'wC:p1', HERDR_TAB_ID: 'wC:t1' });
  writeRecord(env, record('old-dispatch', [{ name: 'the-curator', pane_id: 'wC:p1', tab_id: 'wC:t1' }]));
  const found = findDispatcherForCaller(env);
  assert.equal(found?.dispatch_id, 'old-dispatch');
  assert.equal(found.caller, null, 'a record from before the caller field carries no dispatcher');
  const { env: none } = stateEnv({ HERDR_PANE_ID: 'wZ:p9' });
  assert.equal(findDispatcherForCaller(none), null);
});

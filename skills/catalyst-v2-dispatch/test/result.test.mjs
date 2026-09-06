// findDispatchForCaller: attributes a hand-back (or any caller-scoped read) to
// the dispatch whose recorded meta-agent runs in the caller's own herdr pane.
// The hand-back retirement gate keys on it, so a meta cannot hand back past a
// worker of its own dispatch still in flight (incident 2026-09-06-wave2-conduct).

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { resultPath, findDispatchForCaller } from '../src/result.mjs';

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

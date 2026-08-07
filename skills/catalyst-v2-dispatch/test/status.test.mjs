// roleFor is name-prefix only, and classify never reads an unwatched in-flight
// worker healthy. Regression: a worker brief legitimately contains "hand back"
// (observed live 2026-08-02 on `impl-kind-preflight`); a brief-text heuristic
// would misread such a worker as a meta and report the roster healthy with no
// meta at all.

import assert from 'node:assert/strict';
import test from 'node:test';

import { classify, readStatus, roleFor } from '../src/status.mjs';
import { rig } from './helpers/harness.mjs';

// A roster of three live omp agents, mirroring the live herdr `agent list`
// shape: tab_id/pane_id per entry, agent_status on the entry itself (the
// per-name `agent get` falls back to the roster entry in readStatus).
function rosterReply(agents) {
  return {
    status: 0,
    stdout: `${JSON.stringify({ id: 'cli:agent:list', result: { agents } })}\n`,
  };
}

test('roleFor reads a hand-back brief on a worker name as a worker', () => {
  assert.equal(
    roleFor('impl-kind-preflight', { brief_text_delivered: 'Hand back a diff' }),
    'worker',
  );
});

test('roleFor reads the name prefix only: meta- names are metas, others are workers', () => {
  assert.equal(roleFor('meta-watch'), 'meta');
  assert.equal(roleFor('meta_watch'), 'meta');
  assert.equal(roleFor('impl-x'), 'worker');
});

test('classify: an in-flight worker with no meta on the roster is UNWATCHED, never healthy', () => {
  const result = classify([
    { name: 'impl-kind-preflight', role: roleFor('impl-kind-preflight'), status: 'working' },
  ]);
  assert.equal(result.classification, 'UNWATCHED');
  assert.match(result.reason, /no meta-agent on the roster/);
});

test('classify: a settled meta whose session is still live is META QUIESCENT, not retired early', () => {
  // An omp meta between turns reads 'done' with no background shell while its
  // own harness waits stay armed (incident 2026-08-03-meta-retirement-misdiagnosis).
  const result = classify([
    { name: 'impl-x', role: 'worker', status: 'working' },
    { name: 'meta-w3b', role: 'meta', status: 'done', present: true, background_shells: null, parked_monitoring: false },
  ]);
  assert.equal(result.classification, 'META QUIESCENT');
  assert.match(result.reason, /Probe-and-verify/);
  assert.match(result.reason, /Never run two metas on one wave/);
});

test('classify: a meta reading exited is META RETIRED EARLY while workers are in flight', () => {
  const result = classify([
    { name: 'impl-x', role: 'worker', status: 'working' },
    { name: 'meta-w3', role: 'meta', status: 'exited', present: true },
  ]);
  assert.equal(result.classification, 'META RETIRED EARLY');
  assert.match(result.reason, /is exited while workers are still in flight/);
});

test('classify: a meta absent from the roster is UNWATCHED, not retired', () => {
  const result = classify([
    { name: 'impl-x', role: 'worker', status: 'working' },
    { name: 'meta-w3', role: 'meta', status: null, present: false },
  ]);
  assert.equal(result.classification, 'UNWATCHED');
  assert.match(result.reason, /is not on the roster while workers are in flight/);
});

test('classify: an idle-at-zero-tokens meta stays UNBRIEFED META (camouflage reading)', () => {
  const result = classify([
    { name: 'impl-x', role: 'worker', status: 'working' },
    { name: 'meta-fresh', role: 'meta', status: 'idle', present: true, tokens_spent: false, parked_monitoring: false },
  ]);
  assert.equal(result.classification, 'UNBRIEFED META');
  assert.match(result.reason, /camouflage reading/);
});

test('classify: the caller own entry is never a wake gap, only real gaps are named', () => {
  // The caller's own pane reads working with no live wait: pre-fix that was a
  // self-wait gap the caller dutifully armed, settling immediately (incident
  // 2026-08-04-orchestrator-self-wait).
  const result = classify([
    { name: 'orchestrator', role: roleFor('orchestrator'), caller_self: true, status: 'working', wake: { running: false } },
    { name: 'impl-x', role: 'worker', status: 'working', wake: { running: false } },
    { name: 'meta-w1', role: 'meta', status: 'working', wake: { running: true } },
  ]);
  assert.equal(result.classification, 'UNWATCHED');
  assert.match(result.reason, /impl-x/);
  assert.doesNotMatch(result.reason, /orchestrator/);
});

test('classify: a roster whose only in-flight entry is the caller itself has no worker in flight', () => {
  const result = classify([
    { name: 'orchestrator', role: roleFor('orchestrator'), caller_self: true, status: 'working', wake: { running: false } },
  ]);
  assert.equal(result.classification, 'healthy');
  assert.match(result.reason, /no worker is in flight/);
});

test('readStatus: the caller own roster entry is caller_self with no prescribed wake, and no self wake gap', () => {
  const r = rig({
    agentList: rosterReply([
      { name: 'orchestrator', agent: 'omp', agent_status: 'working', tab_id: 'w1:t1', pane_id: 'w1:p1', cwd: '/workspaces/nix' },
      { name: 'meta-w1', agent: 'omp', agent_status: 'working', tab_id: 'w1:t2', pane_id: 'w1:p2', cwd: '/workspaces/nix' },
      { name: 'impl-x', agent: 'omp', agent_status: 'working', tab_id: 'w1:t3', pane_id: 'w1:p3', cwd: '/workspaces/nix' },
    ]),
  });
  const env = { ...r.env, HERDR_TAB_ID: 'w1:t1', HERDR_PANE_ID: 'w1:p1' };

  const out = readStatus({ env, options: r.options });

  const self = out.agents.find((agent) => agent.name === 'orchestrator');
  assert.equal(self.caller_self, true);
  assert.equal(self.wake.prescribed, false);
  assert.equal(self.wake.command, null);
  assert.match(self.wake.note, /own pane/);
  assert.ok(!out.wake_gaps.includes('orchestrator'), 'the caller own name is never a wake gap');
  assert.ok(out.wake_gaps.includes('meta-w1') && out.wake_gaps.includes('impl-x'));
  assert.doesNotMatch(out.reason, /orchestrator/);
});

test('readStatus: without herdr pane ids no entry is read as the caller', () => {
  const r = rig({
    agentList: rosterReply([
      { name: 'meta-w1', agent: 'omp', agent_status: 'working', tab_id: 'w1:t2', pane_id: 'w1:p2', cwd: '/workspaces/nix' },
    ]),
  });
  const env = { ...r.env, HERDR_TAB_ID: undefined, HERDR_PANE_ID: undefined };

  const out = readStatus({ env, options: r.options });

  assert.equal(out.agents[0].caller_self, false);
  assert.ok(out.agents[0].wake.command.startsWith('herdr agent wait'));
});

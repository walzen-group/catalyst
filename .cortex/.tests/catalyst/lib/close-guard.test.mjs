// Guards the runner's tab-close gate, repaired by
// .cortex/incidents/2026-08-04-runner-closes-in-flight-agent.md. The real
// invoker (makeRealInvoker) must close an actor/judge tab only when the agent
// settled or is gone; a timed-out wait on a still-live agent must leave the
// tab open and surface the failure. The suite's fakeInvoker seam replaces the
// whole invoker and never exercises this path, so this test drives the real
// invoker against fake c2d/herdr binaries: no live agents, deterministic.
// Negative case (in-flight worker): wait times out, agent still live -> no
// close, errored result. Positive case (settled actor tab): wait settles ->
// capture returned, tab closed. Edge case: agent gone -> dead tab closed,
// errored result. Ambiguous case (blocked settle): the wait matches blocked,
// but a blocked agent is live on a dialog -> no close, errored result.

import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { makeRealInvoker } from './dispatch.mjs';

const FAKE_C2D = `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
const input = JSON.parse(readFileSync(0, 'utf8'));
const agent = input.agents?.[0];
process.stdout.write(JSON.stringify({
  agents: [{ name: agent?.name ?? 'x', tab_id: 't-42', brief_text_delivered: agent?.brief?.text ?? '' }],
}));
`;

const FAKE_HERDR = `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
const [verb, sub, target] = process.argv.slice(2);
if (verb === 'agent' && sub === 'wait') {
  // Settle per FAKE_HERDR_SETTLE=1; otherwise the wait window expires.
  process.exit(process.env.FAKE_HERDR_SETTLE === '1' ? 0 : 1);
}
if (verb === 'agent' && sub === 'read') {
  if (process.env.FAKE_HERDR_GONE === '1') {
    process.stderr.write(JSON.stringify({
      error: { code: 'agent_not_found', message: 'agent target ' + target + ' not found' },
    }));
    process.exit(1);
  }
  process.stdout.write('actor deliverable: mandate quoted, skills loaded, final reply.');
  process.exit(0);
}
if (verb === 'tab' && sub === 'close') {
  appendFileSync(process.env.FAKE_HERDR_CLOSE_LOG, target + '\\n');
  process.exit(0);
}
if (verb === 'agent' && sub === 'get') {
  const status = process.env.FAKE_HERDR_STATUS === 'blocked' ? 'blocked' : 'idle';
  process.stdout.write(JSON.stringify({
    id: 'cli:agent:get',
    result: { agent: { agent: 'omp', agent_status: status, agent_session: { agent: 'omp', kind: 'path', value: '/tmp/guard/session.jsonl' }, cwd: '/tmp/guard' } },
  }) + '\\n');
  process.exit(0);
}
process.exit(0);
`;

function rig({ settle, gone, blocked }) {
  const dir = mkdtempSync(join(tmpdir(), 'close-guard-'));
  const c2d = join(dir, 'c2d.mjs');
  const herdr = join(dir, 'herdr.mjs');
  const closeLog = join(dir, 'closes.log');
  writeFileSync(c2d, FAKE_C2D);
  writeFileSync(herdr, FAKE_HERDR);
  chmodSync(c2d, 0o755);
  chmodSync(herdr, 0o755);
  const env = {
    FAKE_HERDR_SETTLE: settle ? '1' : '0',
    FAKE_HERDR_GONE: gone ? '1' : '0',
    FAKE_HERDR_STATUS: blocked ? 'blocked' : 'idle',
    FAKE_HERDR_CLOSE_LOG: closeLog,
  };
  Object.assign(process.env, env);
  const invoke = makeRealInvoker({ bin: c2d, herdrBin: herdr, waitTimeoutMs: 1000, readLines: 10 });
  const input = {
    agents: [{ name: 'guard-actor', cwd: dir, model: 'm/x', cli: 'omp', kind: 'unit', brief: { text: 'brief' } }],
  };
  return { invoke, input, closeLog, env };
}

function closedTabs(closeLog) {
  if (!existsSync(closeLog)) return [];
  return readFileSync(closeLog, 'utf8').trim().split('\n').filter(Boolean);
}

test('a still-live agent whose wait timed out is NOT closed (negative case)', () => {
  const { invoke, input, closeLog } = rig({ settle: false, gone: false });
  const res = invoke(input, { role: 'actor', side: 'declared', slug: 'guard' });
  assert.equal(res.code, 1, 'a settle failure must error the run');
  assert.match(res.stderr, /did not settle/, 'the failure reason must name the settle failure');
  assert.deepEqual(closedTabs(closeLog), [], 'the in-flight agent tab must stay open');
});

test('a settled actor tab IS closed after capture (positive case)', () => {
  const { invoke, input, closeLog } = rig({ settle: true, gone: false });
  const res = invoke(input, { role: 'actor', side: 'declared', slug: 'guard' });
  assert.equal(res.code, 0, 'a settled capture must succeed');
  assert.match(res.report, /actor deliverable/, 'the captured output must be returned');
  assert.deepEqual(closedTabs(closeLog), ['t-42'], 'the settled tab must be closed');
});

test('a gone agent leaves nothing to capture but its dead tab is closed', () => {
  const { invoke, input, closeLog } = rig({ settle: false, gone: true });
  const res = invoke(input, { role: 'actor', side: 'declared', slug: 'guard' });
  assert.equal(res.code, 1, 'nothing captured must error the run');
  assert.match(res.stderr, /gone/, 'the failure reason must name the gone agent');
  assert.deepEqual(closedTabs(closeLog), ['t-42'], 'a dead tab may be closed');
});

// The wait matches idle, done, or blocked. A blocked agent is parked on an
// approval or question UI: live, not finished. Closing its tab terminates a
// live session on an ambiguous settle (incident
// 2026-08-04-steer-failure-killed-claude), so a blocked settle must error the
// run and leave the tab open.

test('a wait settling on a blocked agent is NOT closed (ambiguous settle)', () => {
  const { invoke, input, closeLog } = rig({ settle: true, gone: false, blocked: true });
  const res = invoke(input, { role: 'actor', side: 'declared', slug: 'guard' });
  assert.equal(res.code, 1, 'a blocked settle must error the run');
  assert.match(res.stderr, /blocked/, 'the failure reason must name the blocked settle');
  assert.deepEqual(closedTabs(closeLog), [], 'a live agent on a dialog must keep its tab');
});

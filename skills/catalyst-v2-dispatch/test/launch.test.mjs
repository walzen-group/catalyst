// The dispatch result document. `brief_text_delivered` exists to say what the
// agent actually received, so it must carry the full delivered text: the
// injected catalyst mandate plus the caller's brief, byte-identical to what
// the delivery path handed herdr. The rest of the document keeps its shape.
// User directive 2026-08-04: the mandate is prepended to every dispatch
// delivery, and the delivery record must not lie about what landed.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import test from 'node:test';

import { main } from '../src/cli.mjs';
import { runDispatch } from '../src/dispatch.mjs';
import { OMP_IDLE, OMP_WORKING_GET, rig } from './helpers/harness.mjs';

const CWD = '/tmp/catalyst-verify-omp';
const SESSION = { agent: 'omp', kind: 'path', value: '/tmp/catalyst-verify-omp/session.jsonl' };
const BRIEF = ['You are the catalyst meta-agent for cycle X.', '', 'DUTIES', '1. Monitor.', '2. Verify.'].join('\n');

/** The pinned mandate, with the agent's identity substituted. */
function mandateFor(name) {
  const identity = name ? `a catalyst agent named ${name}` : 'a catalyst agent';
  return [
    `CATALYST MANDATE: you are ${identity}. Before any other action, load`,
    'the catalyst bootstrap skill (skill://catalyst-v2) and, through the',
    'harness skill mechanism, the skill that owns your role; then follow',
    'the brief that follows.',
  ].join('\n');
}

/**
 * A one-agent dispatch rig that reaches a delivered, verified, wake-prescribed
 * launch: the happy path the result document is for. The fake herdr serves the
 * whole launch sequence, tab create through agent get.
 */
function happyDispatch() {
  const r = rig({
    tabCreate: {
      status: 0,
      stdout: `${JSON.stringify({
        id: 'cli:tab:create',
        result: { tab: { tab_id: 't1' }, root_pane: { pane_id: 'p1', cwd: CWD } },
      })}\n`,
    },
    agentStart: {
      status: 0,
      stdout: `${JSON.stringify({
        id: 'cli:agent:start',
        result: { agent: { agent_session: SESSION } },
      })}\n`,
    },
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  const input = {
    dispatch_id: 'result-text-test',
    heartbeat_ms: 60000,
    agents: [
      { name: 'meta', cwd: CWD, cli: 'omp', model: 'deepseek-v4-flash', kind: 'unit', brief: { mode: 'inline', text: BRIEF } },
    ],
  };
  const out = runDispatch(input, { env: r.env, options: r.options });
  return { r, input, out };
}

test('a dispatch result document records the full delivered text, mandate and all', () => {
  const { r, out } = happyDispatch();

  assert.equal(out.document.status, 'ok', JSON.stringify(out.document.failures));
  const agent = out.document.agents[0];
  const expected = `${mandateFor('meta')}\n\n${BRIEF}`;

  // The record carries the post-injection text, not the raw brief: it opens
  // with the mandate and the caller's brief follows after the blank line.
  assert.ok(agent.brief_text_delivered.startsWith('CATALYST MANDATE:'),
    'the recorded delivered text opens with the mandate marker');
  assert.equal(agent.brief_text_delivered, expected,
    'the recorded text is mandate plus the caller brief, one blank line between');
  assert.ok(agent.brief_text_delivered.endsWith(BRIEF), 'the caller brief closes the recorded text');

  // And it is byte-identical to what the delivery path actually handed herdr:
  // the record and the delivery cannot drift.
  const prompts = r.calls('agent prompt');
  assert.equal(prompts.length, 1, 'exactly one prompt was sent');
  assert.equal(agent.brief_text_delivered, prompts[0][3],
    'the recorded text is exactly the text the delivery path sent');
});

// User directive 2026-08-04: the result document records the resolved mandate
// mode per agent, and `brief_text_delivered` stays the exact text herdr
// received. A default dispatch resolves to injected (mandate prepended); a
// caller-owned all-unit dispatch delivers the fixture byte-for-byte.

test('a default dispatch records the resolved mandate mode as injected', () => {
  const { out } = happyDispatch();

  assert.equal(out.document.agents[0].mandate_mode, 'injected');
  assert.ok(out.document.agents[0].brief_text_delivered.startsWith('CATALYST MANDATE:'),
    'the injected mode still delivers the mandate');
});

test('a caller-owned unit dispatch delivers the fixture byte-for-byte and records caller_owned', () => {
  const r = rig({
    tabCreate: {
      status: 0,
      stdout: `${JSON.stringify({
        id: 'cli:tab:create',
        result: { tab: { tab_id: 't1' }, root_pane: { pane_id: 'p1', cwd: CWD } },
      })}\n`,
    },
    agentStart: {
      status: 0,
      stdout: `${JSON.stringify({
        id: 'cli:agent:start',
        result: { agent: { agent_session: SESSION } },
      })}\n`,
    },
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });
  const input = {
    dispatch_id: 'caller-owned-test',
    heartbeat_ms: 60000,
    mandate_mode: 'caller_owned',
    agents: [
      { name: 'judge', cwd: CWD, cli: 'omp', model: 'deepseek-v4-flash', kind: 'unit', brief: { mode: 'inline', text: BRIEF } },
    ],
  };
  const out = runDispatch(input, { env: r.env, options: r.options });

  assert.equal(out.document.status, 'ok', JSON.stringify(out.document.failures));
  const agent = out.document.agents[0];
  assert.equal(agent.mandate_mode, 'caller_owned', 'the resolved mode is recorded on the agent result');
  assert.equal(agent.brief_text_delivered, BRIEF, 'the recorded text is the fixture, byte-for-byte');
  assert.ok(!agent.brief_text_delivered.includes('CATALYST MANDATE:'), 'no mandate reached the record');

  const prompts = r.calls('agent prompt');
  assert.equal(prompts.length, 1, 'exactly one prompt was sent');
  assert.equal(prompts[0][3], BRIEF, 'herdr received exactly the fixture, byte-for-byte');
});

test('an unknown mandate_mode input fails before launch, nothing sent', async () => {
  const r = rig({});
  let out = '';
  const code = await main(['dispatch'], {
    out: { write: (chunk) => { out += chunk; } },
    err: { write: () => {} },
    stdin: Readable.from([JSON.stringify({
      dispatch_id: 'bad-mode',
      heartbeat_ms: 60000,
      mandate_mode: 'replay',
      agents: [
        { name: 'a', cwd: CWD, cli: 'omp', model: 'deepseek-v4-flash', thinking: 'low', kind: 'unit', brief: { mode: 'inline', text: 'x' } },
      ],
    })]),
    fetchRoster: () => [],
  });

  assert.equal(code, 1);
  const doc = JSON.parse(out);
  assert.equal(doc.status, 'failed');
  assert.deepEqual(doc.failures, ['mandate_mode: must be one of injected, caller_owned']);
  assert.equal(r.calls('tab create').length, 0, 'nothing launched');
  assert.equal(r.calls('agent prompt').length, 0, 'nothing delivered');
});

test('a caller_owned input with a non-unit agent fails before launch, nothing sent', async () => {
  const r = rig({});
  let out = '';
  const code = await main(['dispatch'], {
    out: { write: (chunk) => { out += chunk; } },
    err: { write: () => {} },
    stdin: Readable.from([JSON.stringify({
      dispatch_id: 'bad-owned',
      heartbeat_ms: 60000,
      mandate_mode: 'caller_owned',
      agents: [
        { name: 'worker-a', cwd: CWD, cli: 'omp', model: 'deepseek-v4-flash', thinking: 'low', brief: { mode: 'inline', text: 'x' } },
      ],
    })]),
    fetchRoster: () => [],
  });

  assert.equal(code, 1);
  const doc = JSON.parse(out);
  assert.equal(doc.status, 'failed');
  assert.deepEqual(doc.failures, [
    'agents[0].kind: mandate_mode "caller_owned" requires kind "unit" on every agent; "worker-a" is a "worker"',
  ]);
  assert.equal(r.calls('tab create').length, 0, 'nothing launched');
  assert.equal(r.calls('agent prompt').length, 0, 'nothing delivered');
});

test('the rest of the dispatch result document keeps its shape', () => {
  const { out } = happyDispatch();
  const agent = out.document.agents[0];

  assert.equal(out.document.dispatch_id, 'result-text-test');
  assert.equal(out.document.status, 'ok');
  assert.deepEqual(out.document.not_launched, []);
  assert.deepEqual(out.document.prior_failures, []);
  assert.deepEqual(out.document.failures, []);

  assert.equal(agent.name, 'meta');
  assert.equal(agent.cwd, CWD);
  assert.equal(agent.tab_id, 't1');
  assert.equal(agent.pane_id, 'p1');
  assert.deepEqual(agent.session, SESSION);
  assert.equal(agent.model, 'deepseek-v4-flash');
  assert.equal(agent.effort, null);
  assert.equal(agent.thinking, null);
  assert.equal(agent.status_at_return, 'working');
  assert.deepEqual(agent.brief_delivery, {
    verified: true,
    attempts: 1,
    // The status bar carries the cwd, which contains a brief subject word
    // (`catalyst`), so the read-back subject grep matches on the first sample.
    subject_match: true,
    method: 'indirect',
  });
  assert.deepEqual(agent.wake, {
    owed_by: 'caller',
    armed_by_tool: false,
    command: 'herdr agent wait meta --timeout 60000',
    timeout_ms: 60000,
    settled_at_return: false,
    already_running: false,
    existing_wait_pid: null,
    instruction: 'meta is live and UNWATCHED until you run `herdr agent wait meta --timeout 60000` as a background job of YOUR harness (Claude Code: run_in_background: true). This tool cannot wake you: a wait it spawned would be orphaned and its exit would reach nobody.',
  });

  assert.deepEqual(out.document.roster_reconciliation, {
    expected: 1,
    live_on_brief: 0,
    wakes_prescribed: 1,
    wakes_run_by_caller: 'unknown to this tool; read `status` after you arm them',
    agree: false,
  });

  // The persisted document on disk is the same record `status` reads back.
  assert.ok(existsSync(out.persisted), 'the result document is persisted');
  assert.deepEqual(JSON.parse(readFileSync(out.persisted, 'utf8')), out.document);
});

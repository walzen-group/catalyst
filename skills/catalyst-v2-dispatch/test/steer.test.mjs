// steer: the omp delivery path and the settle wake a re-prompt now prescribes.
// Regression anchor: incidents 2026-08-01-omp-delivery-raw-paste,
// 2026-08-01-steer-arms-no-settle-wake, and
// 2026-08-01-dispatch-wake-armed-nothing-delivers.

import assert from 'node:assert/strict';
import test from 'node:test';

import { steerAgent } from '../src/steer.mjs';
import { deliveriesForSession } from '../src/ledger.mjs';
import { readWakeRecord } from '../src/wake.mjs';
import {
  CLAUDE_FOREIGN_TEXT,
  CLAUDE_FOREIGN_TEXT_BACKSPACED,
  CLAUDE_GET,
  CLAUDE_GHOST_QUEUED,
  CLAUDE_IDLE,
  HERDR_STALL_STDERR,
  OMP_DRAFT,
  OMP_IDLE,
  OMP_WORKING_GET,
  claudeGetNoSession,
  rig,
} from './helpers/harness.mjs';

// steer reads the visible screen once, the composer twice (settled pair), the
// omp pre-send hold reads the bar twice, and the consumption read twice again.
const OMP_QUIET_READS = [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE];

const DIRECTIVE = ['FOLLOW-UP for the orchestrator.', '', 'Line one.', 'Line two.', 'Line three.'].join('\n');

test('a steer to an omp agent lands via the confirmed prompt and prescribes a settle wake', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: OMP_QUIET_READS,
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    wakeTimeoutMs: 900000,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'ok', out.failure ? JSON.stringify(out.failure) : out.reason);
  assert.equal(out.delivery.status, 'delivered');
  assert.equal(out.consumed, true);
  // The gap this closes: a steer hands the caller a wake it must run itself,
  // instead of leaving the re-prompted agent unwatched.
  assert.ok(out.wake, 'steer must report a wake');
  assert.equal(out.wake.timeout_ms, 900000);
  assert.equal(out.wake.command, 'herdr agent wait orchestrator --timeout 900000');
  assert.equal(out.wake.owed_by, 'caller');
  assert.equal(readWakeRecord('orchestrator', r.env)?.name, 'orchestrator');

  // The defect this closes (2026-08-01-dispatch-wake-armed-nothing-delivers):
  // the tool used to spawn the wait itself, detached. That process was orphaned
  // to init, nobody observed its exit, and the caller was never resumed — while
  // the result document said `armed: true`. The tool must never claim to have
  // armed anything, and must never report a pid it spawned.
  assert.equal(out.wake.armed, undefined, 'the tool must not claim a wake is armed');
  assert.equal(out.wake.armed_by_tool, false, 'the tool must state plainly that it armed nothing');
  assert.equal(out.wake.pid, undefined, 'the tool must not spawn a wait, so it has no pid to report');
  assert.equal(readWakeRecord('orchestrator', r.env)?.pid, undefined, 'no spawned pid may be recorded');
  assert.match(out.wake.instruction, /background job/i, 'the caller must be told to run it in its own harness');
});

// The steer record is mid-session traffic: the directive goes out and is
// recorded byte-identical, with no mandate. The mandate is a dispatch-delivery
// injection only (user directive 2026-08-04).

test('a steer result records the raw steer text, unchanged, no mandate', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: OMP_QUIET_READS,
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    wakeTimeoutMs: 900000,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'ok', out.failure ? JSON.stringify(out.failure) : out.reason);
  assert.equal(out.text_delivered, DIRECTIVE, 'the steer record carries the caller text byte-identical');
  assert.ok(!out.text_delivered.includes('CATALYST MANDATE:'), 'no mandate reaches a steer record');
});

test('a wake is prescribed even for a target that already settled', () => {
  // The premise the old code skipped on ("a wait on a settled agent matches no
  // transition and times out") is false: measured live, `herdr agent wait` on a
  // settled agent returns at once, exit 0. Skipping left the caller with nothing.
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: OMP_QUIET_READS,
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    wakeTimeoutMs: 900000,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'ok');
  assert.ok(out.wake.command, 'a wake command is handed back whatever the status at return');
  assert.equal(out.wake.skipped, undefined, 'no wake is ever skipped away into nothing');
});

// Regression anchor: incident 2026-08-03-steer-composer-interference. A steer
// to an omp agent whose composer holds a live draft is refused with the draft
// as specimen, so the hand-back never lands in the user's in-progress message.

test('a steer to an omp agent holding a live draft is refused with the draft as specimen', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_DRAFT, OMP_DRAFT],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'refused', out.reason);
  assert.equal(out.specimen, 'half a thought the user was typing');
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is sent over a live draft');
});

// Regression anchor: incident 2026-08-01-dispatch-steer-ghost-text-refused.
// The verb reads the composer three times — before the send, inside delivery,
// and to confirm consumption — and the mid-turn hint fails every one of them.

test('a steer at the queued-messages hint is delivered, and counted consumed', () => {
  // The hint never changes under a keystroke, so a single screen is the honest
  // model: it is a rendering that outlasts everything typed at it.
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_GHOST_QUEUED],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'ok', out.failure ? JSON.stringify(out.failure) : out.specimen);
  assert.equal(out.delivery.status, 'delivered');
  assert.equal(out.consumed, true, 'a hint left on screen is not the directive sitting unconsumed');
  assert.equal(r.calls('agent prompt').length, 1);
});

test('a steer into a composer someone is typing in is still refused', () => {
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_FOREIGN_TEXT],
    readsAfterBackspace: [CLAUDE_FOREIGN_TEXT_BACKSPACED],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'refused');
  assert.match(out.specimen, /half a thought the user was typing/);
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is sent over real input');
  assert.deepEqual(r.calls('pane send-text')[0].slice(2), ['w6:p5', 'g'], 'the probed character goes back');
});

test('a steer whose omp prompt parks fails, with no false consumption and no phantom wake', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.notEqual(out.consumed, true, 'a parked directive is never reported consumed');
  assert.equal(out.wake, null, 'no wake is armed when nothing was delivered');
  assert.equal(readWakeRecord('orchestrator', r.env), null, 'no wake record written on a failed delivery');
});

// Regression anchor: incident 2026-08-04-steer-failure-killed-claude. A steer
// delivery failure is reported and recorded, and it terminates nothing: the
// herdr surface a failed steer may touch is prompt/get/read only, never a tab
// or agent close, kill, stop, or restart. Recovery is the caller's explicit
// decision.

const TERMINATION_VERBS = new Set(['close', 'kill', 'stop', 'restart']);
const TERMINATION_OBJECTS = new Set(['agent', 'tab', 'pane', 'workspace']);

test('a steer delivery failure preserves the target session and tab', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.equal(out.delivery.status, 'failed');
  const calls = r.state().calls ?? [];
  const lethal = calls.filter(
    (argv) => TERMINATION_VERBS.has(argv[1]) && TERMINATION_OBJECTS.has(argv[0]),
  );
  assert.deepEqual(lethal, [], 'a failed steer must never close, kill, stop, or restart the target');
  assert.equal(
    calls.filter((argv) => argv[0] === 'agent' && argv[1] === 'prompt').length,
    1,
    'the directive was attempted exactly once',
  );
  assert.equal(
    calls.filter((argv) => argv[0] === 'agent' && argv[1] === 'send-keys').length,
    0,
    'no keystrokes are sent at the target on a failure',
  );
});

// Regression anchor: incident 2026-08-02-c2d-steer-answer-keys-broken. steer
// used to send keys at the dialog itself, which reimplements what herdr already
// does and cannot express a live question's real key sequence (a multi-stage
// dialog needs a beat between selects; the free-text option is select-then-type).
// steer now detects the block, sends nothing, and hands back a herdr hint; the
// caller answers the question with herdr and re-steers.

const OMP_BLOCKED_GET = {
  status: 0,
  stdout: `${JSON.stringify({
    id: 'cli:agent:get',
    result: {
      agent: {
        agent: 'omp',
        agent_status: 'blocked',
        agent_session: { agent: 'omp', kind: 'path', value: '/tmp/catalyst-verify-omp/session.jsonl' },
        cwd: '/tmp/catalyst-verify-omp',
        screen_detection_skipped: true,
      },
    },
  })}\n`,
};

test('a blocked agent is reported with a herdr hint, never answered or steered', () => {
  const r = rig({
    agentGet: OMP_BLOCKED_GET,
    reads: [OMP_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'blocked');
  assert.equal(out.status_at_return, 'blocked');
  assert.equal(out.text_delivered, null, 'nothing is delivered into a blocked agent');
  assert.match(out.hint, /herdr agent send-keys/, 'the caller is pointed at herdr to answer it');
  assert.match(out.hint, /re-run steer/i, 'and told to re-steer once it is unblocked');
  assert.equal(r.calls('agent send-keys').length, 0, 'steer sends no keys at the dialog');
  assert.equal(r.calls('agent prompt').length, 0, 'and no directive into the block');
  assert.equal(out.wake, null, 'no wake is prescribed when nothing was delivered');
});

// herdr 0.8.0 publishes no `agent_session` for a claude agent, so a steer must
// derive the same session identity the dispatch keyed its delivery ledger on
// (incident 2026-08-18-c2d-claude-session-identity). Without it, the delivery
// refuses with "the agent has no session, so this delivery could be neither
// recorded nor attributed" — the exact second-order failure the curator steer
// hit on 2026-08-17.

test('a steer to a claude agent with no agent_session published still delivers, keyed on the derived identity', () => {
  const r = rig({
    agentGet: claudeGetNoSession({ name: 'orchestrator' }),
    reads: [CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = steerAgent({
    agent: 'orchestrator',
    text: DIRECTIVE,
    wakeTimeoutMs: 900000,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'ok', out.failure ? JSON.stringify(out.failure) : out.reason);
  assert.equal(out.delivery.status, 'delivered');
  assert.equal(out.consumed, true);
  // The delivery was recorded against the derived identity, so the ledger has
  // a key for attribution instead of none at all.
  const derived = 'herdr:agent:orchestrator:term_0804:w1:p5';
  const records = deliveriesForSession(derived, r.env);
  assert.ok(records.length >= 1, 'the steer delivery is recorded against the derived identity');
  assert.equal(records[0].agent, 'orchestrator');
  assert.equal(records[0].session, derived);
});

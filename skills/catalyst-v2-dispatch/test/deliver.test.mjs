// Brief delivery, and the swallowed-Enter recovery behind it.
// Regression anchor: incident 2026-08-01-dispatch-multiline-prompt-parked-paste.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { deliver, hasOmpParkedChip, isOurParkedText, sessionShowsSubmitted, stallCode } from '../src/deliver.mjs';
import {
  CLAUDE_FOREIGN_TEXT,
  CLAUDE_FOREIGN_TEXT_BACKSPACED,
  CLAUDE_GET,
  CLAUDE_GHOST_QUEUED,
  CLAUDE_IDLE,
  CLAUDE_PARKED_PASTE,
  HERDR_STALL_STDERR,
  OMP_DRAFT,
  OMP_IDLE,
  OMP_PARKED_PASTE,
  OMP_WORKING,
  OMP_WORKING_GET,
  rig,
} from './helpers/harness.mjs';

const BRIEF = ['You are the catalyst meta-agent for cycle X.', '', 'DUTIES', '1. Monitor.', '2. Verify.'].join('\n');

// Regression anchor for the omp side: incidents 2026-08-01-omp-delivery-raw-paste
// and 2026-08-01-omp-parked-paste-chip. A clean omp send leans on herdr's own
// confirmed submit; a stall that leaves a paste chip parked is Enter-recovered
// the way claude's composer paste is, and one that shows no chip stays honest.

test('an omp brief lands via herdr\'s confirmed submit over a quiet composer', () => {
  const r = rig({ reads: [OMP_IDLE, OMP_IDLE], prompt: { status: 0, stdout: '{"result":{}}' } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-omp/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  const prompts = r.calls('agent prompt');
  assert.equal(prompts.length, 1);
  // The send carries herdr's landing confirmation, not a fire-and-forget write.
  const argv = prompts[0];
  assert.ok(argv.includes('--wait') && argv.includes('--until') && argv.includes('working'),
    `omp send must confirm the landing: ${argv.join(' ')}`);
  // The pre-send hold reads the composer bar (one settled pair) and nothing else.
  assert.equal(r.calls('agent read').length, 2, 'a clean omp submit reads the settled composer bar once');
  assert.equal(r.calls('agent send-keys').length, 0, 'a clean omp submit presses no keys');
});

// Regression anchor: incident 2026-08-03-steer-composer-interference. herdr
// writes the prompt into the agent's own input buffer, so a live draft is
// appended to and submitted along with the text. The omp composer is the
// bottom bar of the status box, so the draft is observable: the delivery holds
// with the draft as specimen, nothing sent.

test('an omp delivery over a live composer draft is refused with the draft as specimen', () => {
  const r = rig({ reads: [OMP_DRAFT, OMP_DRAFT], prompt: { status: 0, stdout: '{"result":{}}' } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-draft/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'refused', out.reason);
  assert.equal(out.specimen, 'half a thought the user was typing');
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is sent over a live draft');
  assert.equal(r.calls('agent send-keys').length, 0, 'no keystroke touches the draft');
});

test('an omp delivery with no readable composer bar fails honestly, nothing sent', () => {
  const r = rig({ reads: [' ⠸ Working… ⟦esc⟧', ' ⠸ Working… ⟦esc⟧'], prompt: { status: 0, stdout: '{"result":{}}' } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-draft/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /could not locate the omp composer bar/);
  assert.equal(r.calls('agent prompt').length, 0, 'a bar-less screen is never sent blind');
});

test('an omp parked-paste chip does not trip the pre-send hold', () => {
  // The chip renders ABOVE the bar (captured live 2026-08-01), so the bar is
  // empty and the composer is quiet: the send proceeds and the stall recovery
  // handles the chip exactly as before the hold existed.
  const r = rig({ reads: [OMP_PARKED_PASTE, OMP_PARKED_PASTE], prompt: { status: 0, stdout: '{"result":{}}' } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-park/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.equal(r.calls('agent prompt').length, 1);
});

test('an omp paste chip is recognized on its own wording, not claude\'s', () => {
  assert.equal(hasOmpParkedChip('[Paste #1, +107 lines]'), true);
  assert.equal(hasOmpParkedChip(' [Paste #2, +12 lines] '), true);
  assert.equal(hasOmpParkedChip('[Paste #3 +5 lines]'), true, 'the comma is optional');
  assert.equal(hasOmpParkedChip('[Pasted text #1 +43 lines]'), false, 'claude\'s placeholder is not an omp chip');
  assert.equal(hasOmpParkedChip('nothing parked here'), false);
});

test('a parked omp paste (herdr stall + chip) is released with Enter and verified working', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE, OMP_IDLE, OMP_PARKED_PASTE, OMP_PARKED_PASTE],
    readsAfterEnter: [OMP_WORKING, OMP_WORKING],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-park/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.equal(out.attempts, 1);
  const keys = r.calls('agent send-keys');
  assert.equal(keys.length, 1, 'the parked chip is released with exactly one Enter');
  assert.deepEqual(keys[0].slice(2), ['orchestrator', 'enter']);
});

test('an omp paste that never clears fails honestly after its Enter attempts, never delivered', () => {
  const r = rig({
    agentGet: OMP_WORKING_GET,
    reads: [OMP_IDLE, OMP_IDLE, OMP_PARKED_PASTE, OMP_PARKED_PASTE],
    readsAfterEnter: [OMP_PARKED_PASTE, OMP_PARKED_PASTE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-park/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /never consumed after 3 Enter attempts/);
  assert.equal(r.calls('agent send-keys').length, 3);
});

test('omp recovery bounded to zero attempts never Enters and fails honestly', () => {
  const r = rig({
    reads: [OMP_IDLE, OMP_IDLE, OMP_PARKED_PASTE, OMP_PARKED_PASTE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-park/session.jsonl',
    text: BRIEF,
    env: { ...r.env, CATALYST_DISPATCH_OMP_ENTER_ATTEMPTS: '0' },
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /never consumed after 0 Enter attempts/);
  assert.equal(r.calls('agent send-keys').length, 0, 'zero attempts means no Enter is ever sent');
});

test('an omp stall with no parked-paste chip on screen is an honest failure, never blindly Entered', () => {
  const r = rig({
    reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-omp/session.jsonl',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /no parked-paste chip appeared/);
  // Nothing recognizable to recover means no keystroke is sent on a guess.
  assert.equal(r.calls('agent send-keys').length, 0, 'omp never Enters when no chip is on screen');
});

// Regression anchor: incident 2026-08-01-dispatch-steer-reported-failure-after-delivery.
// herdr's --wait confirmation observes a state transition, so a steer to an
// agent that is already working is written into the session and still reported
// agent_prompt_stalled. The session transcript is the record of submission: the
// exact text as a user message.

test('an omp stall with no chip is delivered when the session shows the text submitted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-session-'));
  const sessionPath = join(dir, 'session.jsonl');
  // A real dispatch transcript carries the injected mandate ahead of the brief,
  // so the session proof is keyed on the full delivered text.
  const delivered = `${mandateFor('orchestrator')}\n\n${BRIEF}`;
  writeFileSync(sessionPath, `${JSON.stringify({ type: 'message', timestamp: '2026-08-01T18:01:07.867Z', message: { role: 'user', content: delivered } })}\n`);

  const r = rig({ reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE], prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: sessionPath,
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.match(out.reason, /session/);
  assert.equal(r.calls('agent prompt').length, 1, 'the confirmed send still happened');
  assert.equal(r.calls('agent send-keys').length, 0, 'nothing parked, so no Enter is sent');
});

test('a session without the sent text keeps a chip-less stall an honest failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-session-'));
  const sessionPath = join(dir, 'session.jsonl');
  writeFileSync(sessionPath, `${JSON.stringify({ type: 'message', timestamp: '2026-08-01T17:52:46.938Z', message: { role: 'user', content: 'an earlier, unrelated prompt' } })}\n`);

  const r = rig({ reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE], prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: sessionPath,
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /no parked-paste chip appeared/);
  assert.equal(r.calls('agent send-keys').length, 0);
});

// Regression anchor: incident 2026-08-04-steer-delivery-false-negative.
// opencode writes a prompt queued behind a running turn into the session jsonl
// only when the turn ends, which can be minutes after herdr declared the stall
// (observed: failure filed 21:46:08, session write 21:48:39). A single sample
// at stall time therefore misses a prompt that was delivered, so the chip-less
// stall proof polls the session over a bounded window instead of once.

test('an omp stall with no chip is delivered when the session proof lands within the proof window', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-session-'));
  const sessionPath = join(dir, 'session.jsonl');
  // A dispatch delivery carries the mandate ahead of the brief, so the session
  // proof is keyed on the full delivered text (as in the one-shot sibling
  // above). The transcript write arrives after the first proof sample, on the
  // fifth `agent read` (two settled reads before the send, two in the first
  // recovery iteration, then the second iteration starts).
  const delivered = `${mandateFor('orchestrator')}\n\n${BRIEF}`;
  const entry = JSON.stringify({ type: 'message', timestamp: '2026-08-04T21:48:39.872Z', message: { role: 'user', content: delivered } });

  const r = rig({
    reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
    onRead: [{ after: 4, write: { path: sessionPath, line: entry } }],
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: sessionPath,
    text: BRIEF,
    env: { ...r.env, CATALYST_DISPATCH_SESSION_PROOF_MS: '60000', CATALYST_DISPATCH_SESSION_PROOF_INTERVAL_MS: '0' },
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.match(out.reason, /session/);
  assert.equal(r.calls('agent prompt').length, 1, 'the confirmed send still happened');
  assert.equal(r.calls('agent send-keys').length, 0, 'nothing parked, so no Enter is sent');
});

// Regression anchor: incident 2026-08-04-steer-delivery-false-negative, which
// repeated the 2026-08-01 observation that a false failure made the caller
// re-steer agents that had already received the text. A retry must not re-send
// text the session already proves submitted: the transcript is the record of
// submission, so the pre-send check consults it like the ledger and the retry
// records the delivery without a second prompt.

test('a retry over a session that already shows the exact text is skipped, nothing re-sent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-session-'));
  const sessionPath = join(dir, 'session.jsonl');
  const delivered = `${mandateFor('orchestrator')}\n\n${BRIEF}`;
  writeFileSync(sessionPath, `${JSON.stringify({ type: 'message', timestamp: '2026-08-04T21:48:39.872Z', message: { role: 'user', content: delivered } })}\n`);

  const r = rig({ reads: [OMP_IDLE, OMP_IDLE], prompt: { status: 0, stdout: '{"result":{}}' } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: sessionPath,
    text: BRIEF,
    env: { ...r.env, CATALYST_DISPATCH_PROMPT_FORCE: '0' },
    options: r.options,
  });

  assert.equal(out.status, 'skipped', out.reason);
  assert.match(out.reason, /session/);
  assert.equal(r.calls('agent prompt').length, 0, 'no second send: the session already holds the text');
  assert.equal(r.calls('agent read').length, 0, 'the session check reads no screen');
});

// The bounded window stays honest: a chip-less stall whose session never shows
// the text fails after the window expires, never delivered and never Entered.

test('a chip-less stall whose session never shows the text fails honestly after the proof window', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-session-'));
  const sessionPath = join(dir, 'session.jsonl');
  writeFileSync(sessionPath, `${JSON.stringify({ type: 'message', timestamp: '2026-08-01T17:52:46.938Z', message: { role: 'user', content: 'an earlier, unrelated prompt' } })}\n`);

  const r = rig({ reads: [OMP_IDLE, OMP_IDLE, OMP_IDLE, OMP_IDLE], prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR } });

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: sessionPath,
    text: BRIEF,
    env: { ...r.env, CATALYST_DISPATCH_SESSION_PROOF_MS: '1', CATALYST_DISPATCH_SESSION_PROOF_INTERVAL_MS: '0' },
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /no parked-paste chip appeared/);
  assert.match(out.reason, /proof window/);
  assert.equal(r.calls('agent send-keys').length, 0);
});

test('sessionShowsSubmitted reads a submitted user message from the transcript', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-session-'));
  const sessionPath = join(dir, 'session.jsonl');
  writeFileSync(sessionPath, [
    JSON.stringify({ type: 'session', id: 's1' }),
    JSON.stringify({ type: 'message', message: { role: 'assistant', content: 'an earlier reply' } }),
    JSON.stringify({ type: 'message', message: { role: 'user', content: [{ type: 'text', text: BRIEF }] } }),
  ].join('\n'));

  assert.equal(sessionShowsSubmitted(sessionPath, BRIEF), true, 'block-list user content matches');
  assert.equal(sessionShowsSubmitted(sessionPath, 'not in the session'), false);
  assert.equal(sessionShowsSubmitted(join(dir, 'missing.jsonl'), BRIEF), false, 'unreadable session is no evidence');
  assert.equal(sessionShowsSubmitted('', BRIEF), false);
});

test('herdr reports a stall on stderr, and that is where the code is read from', () => {
  // The live transcript from the failed dispatch: stdout empty, body on stderr.
  assert.equal(stallCode({ stdout: '', stderr: HERDR_STALL_STDERR }), 'agent_prompt_stalled');
  assert.equal(stallCode({ stdout: '', stderr: 'warming up\n' + HERDR_STALL_STDERR }), 'agent_prompt_stalled');
  assert.equal(stallCode({ stdout: '', stderr: '' }), null);
});

test('a parked paste placeholder is recognized as our own text', () => {
  assert.equal(isOurParkedText('[Pasted text #1 +43 lines]', BRIEF), true);
  assert.equal(isOurParkedText('[Pasted text #2]', BRIEF), true);
  assert.equal(isOurParkedText('something the user typed', BRIEF), false);
});

test('a stalled multi-line send is released with Enter and verified consumed', () => {
  const r = rig({
    reads: [CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_PARKED_PASTE, CLAUDE_PARKED_PASTE],
    readsAfterEnter: [CLAUDE_IDLE, CLAUDE_IDLE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.equal(out.attempts, 1);
  const keys = r.calls('agent send-keys');
  assert.equal(keys.length, 1);
  assert.deepEqual(keys[0].slice(2), ['meta', 'enter']);
});

test('a composer that never clears fails loudly after its Enter attempts', () => {
  const r = rig({
    reads: [CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_PARKED_PASTE, CLAUDE_PARKED_PASTE],
    readsAfterEnter: [CLAUDE_PARKED_PASTE, CLAUDE_PARKED_PASTE],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /never consumed after 3 Enter attempts/);
  assert.equal(r.calls('agent send-keys').length, 3);
});

test('a failure that is not a stall is not treated as one', () => {
  const notStalled = JSON.stringify({ error: { code: 'agent_not_found', message: 'nope' } });
  const r = rig({
    reads: [CLAUDE_IDLE, CLAUDE_IDLE],
    prompt: { status: 1, stdout: '', stderr: `${notStalled}\n` },
  });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.equal(out.reason, 'herdr agent prompt failed');
  assert.equal(r.calls('agent send-keys').length, 0, 'no keystroke belongs in a non-stall failure');
});

test('a clean send needs no recovery at all', () => {
  const r = rig({
    reads: [CLAUDE_IDLE, CLAUDE_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered');
  assert.equal(out.attempts, 1);
  assert.equal(r.calls('agent send-keys').length, 0);
});

test('a composer that is only slow to draw is waited for, not failed', () => {
  // Answering the trust prompt returns before Claude has redrawn its prompt.
  // Reading once there saw no composer and failed a healthy agent (live,
  // 2026-08-01, dispatch 2026-08-01-dispatch-repair-verify run 3).
  const r = rig({
    reads: ['', '', CLAUDE_IDLE, CLAUDE_IDLE],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.equal(r.calls('agent prompt').length, 1);
});

test('a composer that never appears still fails, with the screen', () => {
  const r = rig({
    reads: [''],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: { ...r.env, CATALYST_DISPATCH_COMPOSER_ATTEMPTS: '3' },
    options: r.options,
  });

  assert.equal(out.status, 'failed');
  assert.match(out.reason, /could not locate the composer/);
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is sent at a composer that was never found');
});

// Regression anchor: incident 2026-08-01-dispatch-steer-ghost-text-refused.
// Claude Code renders `Press up to edit queued messages` in the composer area
// while it is mid-turn with something queued. It reads exactly like parked user
// text and is nothing of the sort: no editable buffer stands behind it. The
// probe is a backspace — text that does not shorten under one was never text.

test('ghost text in the composer is not real input, so the brief is delivered over it', () => {
  // No readsAfterBackspace: the screen is unmoved by the keystroke, which is
  // what a rendering does and what an editable buffer cannot do.
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_GHOST_QUEUED, CLAUDE_GHOST_QUEUED],
    prompt: { status: 0, stdout: '{"result":{}}' },
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  assert.equal(r.calls('agent prompt').length, 1, 'the send happens; the hint is not text to refuse over');
  const keys = r.calls('agent send-keys');
  assert.equal(keys.length, 1, 'exactly one probe keystroke');
  assert.deepEqual(keys[0].slice(2), ['orchestrator', 'backspace']);
  assert.equal(r.calls('pane send-text').length, 0, 'nothing was deleted, so nothing is typed back');
});

test('ghost text appearing after the stall is delivery, not a refusal', () => {
  // The incident's own shape: the composer was empty before the send, herdr
  // reported agent_prompt_stalled because a working agent never transitions,
  // and the hint then appeared *because* the prompt had been queued.
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_IDLE, CLAUDE_IDLE, CLAUDE_GHOST_QUEUED, CLAUDE_GHOST_QUEUED],
    prompt: { status: 1, stdout: '', stderr: HERDR_STALL_STDERR },
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  const keys = r.calls('agent send-keys');
  assert.equal(keys.length, 1, 'the probe only; no Enter is pressed at a hint');
  assert.deepEqual(keys[0].slice(2), ['orchestrator', 'backspace']);
});

test('real text that shortens under the probe is still refused, and never sent over', () => {
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_FOREIGN_TEXT, CLAUDE_FOREIGN_TEXT],
    readsAfterBackspace: [CLAUDE_FOREIGN_TEXT_BACKSPACED, CLAUDE_FOREIGN_TEXT_BACKSPACED],
  });

  const out = deliver({
    name: 'orchestrator',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'refused');
  assert.match(out.specimen, /half a thought the user was typing/);
  assert.equal(r.calls('agent prompt').length, 0, 'nothing is sent into someone else\'s composer');
});

test('the probe puts back the character it took: real input survives it intact', () => {
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_FOREIGN_TEXT, CLAUDE_FOREIGN_TEXT],
    readsAfterBackspace: [CLAUDE_FOREIGN_TEXT_BACKSPACED, CLAUDE_FOREIGN_TEXT_BACKSPACED],
  });

  deliver({
    name: 'orchestrator',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(r.calls('agent send-keys').length, 1, 'one backspace, never a second');
  const typed = r.calls('pane send-text');
  assert.equal(typed.length, 1, 'the deleted character is typed back');
  // The pane comes from `agent get`, and the text is the one character the probe
  // removed — "half a thought the user was typing" minus its final "g".
  assert.deepEqual(typed[0].slice(2), ['w6:p5', 'g']);
});

test('a composer holding someone else\'s text is refused, never Entered', () => {
  const foreign = CLAUDE_IDLE.replace('❯ ', '❯ half a thought the user was typing');
  const r = rig({ reads: [foreign, foreign] });

  const out = deliver({
    name: 'meta',
    cli: 'claude',
    session: 'a29741d8',
    text: BRIEF,
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'refused');
  assert.equal(r.calls('agent send-keys').length, 0);
});

// User directive 2026-08-04: every c2d dispatch delivery injects the pinned
// catalyst mandate ahead of the caller's brief, so a launched agent loads the
// bootstrap and its role skill before anything else. Steer deliveries are
// mid-session traffic and stay byte-identical.

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

/** The text the tool handed herdr for `agent prompt` in a clean omp send. */
function deliveredText(r) {
  const prompts = r.calls('agent prompt');
  assert.equal(prompts.length, 1, 'exactly one prompt was sent');
  return prompts[0][3];
}

function cleanRig() {
  return rig({ reads: [OMP_IDLE, OMP_IDLE], prompt: { status: 0, stdout: '{"result":{}}' } });
}

test('a dispatch delivery prepends the mandate to the caller\'s brief, verbatim after a blank line', () => {
  const r = cleanRig();

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  const delivered = deliveredText(r);
  assert.ok(delivered.startsWith('CATALYST MANDATE:'), 'the delivered text opens with the mandate marker');
  assert.equal(delivered, `${mandateFor('orchestrator')}\n\n${BRIEF}`,
    'the caller text follows the mandate verbatim, one blank line between');
});

test('the mandate loads the bootstrap and role skills through the harness skill mechanism, never a filesystem path', () => {
  const r = cleanRig();

  deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    env: r.env,
    options: r.options,
  });

  const delivered = deliveredText(r);
  assert.match(delivered, /catalyst bootstrap skill \(skill:\/\/catalyst-v2\)/, 'the mandate names the bootstrap skill by harness URI');
  assert.match(delivered, /the skill that owns your role/, 'the mandate names the role skill');
  assert.match(delivered, /harness skill mechanism/, 'the mandate routes skill loading through the harness');
  assert.ok(!delivered.includes('settings/skills'), 'the mandate names no skills directory');
  assert.ok(!delivered.includes(homedir()), 'the mandate carries no filesystem path');
  assert.ok(!/\bread\b/.test(delivered), 'the mandate never instructs a raw file read');
});

test('the mandate names the dispatched agent so the session knows its own roster entry', () => {
  const r = cleanRig();

  deliver({
    name: 'meta-orch-id-0804',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    env: r.env,
    options: r.options,
  });

  const delivered = deliveredText(r);
  assert.ok(delivered.includes('a catalyst agent named meta-orch-id-0804'),
    'the mandate carries the agent\'s roster name');
  assert.ok(!delivered.includes('you are a catalyst agent. Before'),
    'the unnamed mandate form is not used for a named dispatch');
});

test('the mandate stays byte-identical whatever CATALYST_SKILL_ROOT says', () => {
  const custom = '/custom/catalyst/skills';
  const r = cleanRig();

  deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    env: { ...r.env, CATALYST_SKILL_ROOT: custom },
    options: r.options,
  });

  const overridden = deliveredText(r);
  assert.equal(overridden, `${mandateFor('orchestrator')}\n\n${BRIEF}`,
    'the mandate carries no skill root, so the env var cannot alter the delivered text');
  assert.ok(!overridden.includes(custom), 'no custom root reaches the delivered text');

  const fallbackRig = cleanRig();
  const bare = { ...fallbackRig.env };
  delete bare.CATALYST_SKILL_ROOT;

  deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    env: bare,
    options: fallbackRig.options,
  });

  const fallenBack = deliveredText(fallbackRig);
  assert.equal(fallenBack, `${mandateFor('orchestrator')}\n\n${BRIEF}`,
    'set or unset, the env var leaves the delivered text unchanged');
});

test('a steer delivery carries the caller text unchanged, no mandate', () => {
  const r = cleanRig();

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'steer',
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  const delivered = deliveredText(r);
  assert.equal(delivered, BRIEF, 'steer text is byte-identical to the caller text');
  assert.ok(!delivered.includes('CATALYST MANDATE:'), 'no mandate reaches a steer');
});

test('an explicit mandateMode injected prepends the mandate exactly like the default', () => {
  const r = cleanRig();

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    mandateMode: 'injected',
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  const delivered = deliveredText(r);
  assert.equal(delivered, `${mandateFor('orchestrator')}\n\n${BRIEF}`,
    'injected means mandate plus the caller brief, one blank line between');
});

test('a caller_owned dispatch sends the brief byte-for-byte, no mandate', () => {
  const r = cleanRig();

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    mandateMode: 'caller_owned',
    env: r.env,
    options: r.options,
  });

  assert.equal(out.status, 'delivered', out.reason);
  const delivered = deliveredText(r);
  assert.equal(delivered, BRIEF, 'the caller text is sent unchanged, byte-for-byte');
  assert.ok(!delivered.includes('CATALYST MANDATE:'), 'no mandate reaches a caller-owned delivery');
  assert.equal(out.text, BRIEF, 'the delivery result reports the exact text sent');
});

test('the recorded delivery document holds the full delivered text including the mandate', () => {
  const r = cleanRig();

  const out = deliver({
    name: 'orchestrator',
    cli: 'omp',
    session: '/tmp/catalyst-verify-mandate/session.jsonl',
    text: BRIEF,
    verb: 'dispatch',
    env: r.env,
    options: r.options,
  });
  assert.equal(out.status, 'delivered', out.reason);

  const delivered = deliveredText(r);
  const key = createHash('sha256').update(`/tmp/catalyst-verify-mandate/session.jsonl\0${delivered}`).digest('hex');
  const record = JSON.parse(readFileSync(join(r.dir, 'state', 'catalyst-v2-dispatch', 'delivery', `${key}.json`), 'utf8'));

  assert.equal(record.verb, 'dispatch');
  assert.equal(record.text, delivered, 'the recorded text is the full delivered text, mandate included');
  assert.ok(record.text.startsWith('CATALYST MANDATE:') && record.text.endsWith(BRIEF));
});

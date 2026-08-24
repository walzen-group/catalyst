// Screen classification and the startup-screen recovery.
// Regression anchor: incident 2026-08-01-dispatch-interactive-screen-misclassification.

import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyScreen, extractComposer, ompComposerText, probeGhostText, recoverStartupScreen } from '../src/screens.mjs';
import {
  CLAUDE_FOREIGN_TEXT,
  CLAUDE_FOREIGN_TEXT_BACKSPACED,
  CLAUDE_GET,
  CLAUDE_GHOST_QUEUED,
  CLAUDE_IDLE,
  CLAUDE_PARKED_PASTE,
  OMP_DRAFT,
  OMP_DRAFT_EDITOR,
  OMP_IDLE,
  SHELL_STARTUP_NOISE,
  TRUST_PROMPT,
  TRUST_PROMPT_LIVE,
  UNKNOWN_GATE,
  rig,
} from './helpers/harness.mjs';

const CWD = '/workspaces/statswatch/statswatch-native';
// Regression anchor: incident 2026-08-03-steer-composer-interference, plus the
// omp 18.x composer switch (2026-08-24). omp draws its input buffer as the
// bottom bar of the status box, or from 18.x as a `❯` editor above a rule; a
// draft in either is text the delivery hold must see before sending.

test('the omp composer bar holds a live draft between its frame ends', () => {
  // The bar draws a space of padding after the frame; callers collapse before
  // judging, exactly like the delivery hold does.
  assert.equal(ompComposerText(OMP_DRAFT).replace(/\s+/g, ' ').trim(), 'half a thought the user was typing');
  assert.equal(ompComposerText(OMP_IDLE).trim(), '', 'a quiet omp composer is an empty bar');
  assert.equal(ompComposerText(OMP_IDLE) !== null, true, 'the bar is located even when empty');
});

test('a screen without the omp bottom bar has no readable composer', () => {
  assert.equal(ompComposerText(' ⠸ Working… ⟦esc⟧'), null);
  assert.equal(ompComposerText(''), null);
  assert.equal(ompComposerText(null), null);
});

test('a trailing cursor row or newline does not hide the omp composer bar', () => {
  // Live captures end with the pane's cursor row after the bar.
  assert.equal(ompComposerText(`${OMP_DRAFT}\n`).replace(/\s+/g, ' ').trim(), 'half a thought the user was typing');
  assert.equal(ompComposerText(`${OMP_IDLE}\n`).trim(), '', 'a quiet bar with a trailing row is still quiet');
});

test('the 18.x editor render holds a live draft after the prompt marker', () => {
  assert.equal(ompComposerText(OMP_DRAFT_EDITOR).replace(/\s+/g, ' ').trim(), 'live draft specimen');
});

test('a quoted prompt mid-scroll is not a live draft', () => {
  // A transcript echo has output below it, not a closing rule near the bottom
  // of the capture; only the live editor draws that shape.
  const echoed = [
    '❯ some earlier command',
    'lots of transcript output',
    'more transcript output',
    ' π  · ⬢ DeepSeek V4 Flash · ◒ high · 🗑 /tmp/catalyst-verify-omp',
  ].join('\n');
  assert.equal(ompComposerText(echoed), null);
});

test('a box in startup output is unattributed, and that alone decides nothing', () => {
  // The pnpm update notice draws a box, so a single capture cannot tell it from
  // a dialog. The classifier says so and stops there: what makes it a gate is
  // outlasting the startup window, which is recoverStartupScreen's call, not a
  // verdict taken off one frame. That split is the fix — see the wait tests.
  assert.equal(classifyScreen(SHELL_STARTUP_NOISE, CWD).kind, 'other');
});

test('a drawn composer settles it: the CLI is taking input', () => {
  assert.notEqual(extractComposer(CLAUDE_IDLE), null);
  assert.equal(classifyScreen(CLAUDE_IDLE, CWD).kind, 'none');
  assert.equal(classifyScreen(CLAUDE_PARKED_PASTE, CWD).kind, 'none');
});

test('the trust prompt is still recognized, and still checked against the cwd', () => {
  const mine = classifyScreen(TRUST_PROMPT, CWD);
  assert.equal(mine.kind, 'trust');
  assert.equal(mine.names_cwd, true);

  const elsewhere = classifyScreen(TRUST_PROMPT, '/workspaces/statswatch/statswatch-worker');
  assert.equal(elsewhere.kind, 'trust');
  assert.equal(elsewhere.names_cwd, false);
});

test('a real gate with no composer is still a gate', () => {
  assert.equal(classifyScreen(UNKNOWN_GATE, CWD).kind, 'other');
});

test('the trust prompt Claude Code actually draws is recognized', () => {
  // Reworded, and bordered with rules instead of a box: neither the old marker
  // nor the box scan saw it, so a launch sat behind it until the session wait
  // gave up. Live capture, 2026-08-01.
  const screen = classifyScreen(TRUST_PROMPT_LIVE, '/tmp/catalyst-verify');
  assert.equal(screen.kind, 'trust');
  assert.equal(screen.names_cwd, true);
});

test('a keyboard select without a border is a gate, not a blank screen', () => {
  const noMarker = TRUST_PROMPT_LIVE
    .replace('Quick safety check: Is this a project you created or one you trust?', 'Pick one')
    .replace('Yes, I trust this folder', 'Subscription');
  assert.equal(classifyScreen(noMarker, '/tmp/catalyst-verify').kind, 'other');
});

test('the live trust prompt is answered, and the cwd is still checked', () => {
  const r = rig({ reads: [TRUST_PROMPT_LIVE] });
  const ok = recoverStartupScreen({ name: 'v', cwd: '/tmp/catalyst-verify', options: r.options, env: r.env });
  assert.equal(ok.action, 'trust-enter');
  assert.deepEqual(r.calls('agent send-keys')[0].slice(2), ['v', 'enter']);

  const other = rig({ reads: [TRUST_PROMPT_LIVE] });
  const refused = recoverStartupScreen({ name: 'v', cwd: '/workspaces/statswatch', options: other.options, env: other.env });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /names a different path/);
  assert.equal(other.calls('agent send-keys').length, 0);
});

test('startup noise is waited through, not aborted on', () => {
  // Exactly the failing dispatch: noise, more noise, then Claude comes up.
  const r = rig({ reads: [SHELL_STARTUP_NOISE, SHELL_STARTUP_NOISE, CLAUDE_IDLE] });
  const out = recoverStartupScreen({ name: 'impl', cwd: CWD, options: r.options, env: r.env });

  assert.equal(out.ok, true);
  assert.equal(out.action, 'none');
  assert.equal(r.calls('agent send-keys').length, 0, 'nothing should have been typed at a healthy startup');
  assert.ok(r.calls('agent read').length >= 3, 'the screen must be polled, not sampled once');
});

test('a published session ends the wait even if the screen never resolves', () => {
  const r = rig({ reads: [SHELL_STARTUP_NOISE] });
  let polls = 0;
  const out = recoverStartupScreen({
    name: 'impl',
    cwd: CWD,
    options: r.options,
    env: { ...r.env, CATALYST_DISPATCH_SCREEN_ATTEMPTS: '10' },
    isReady: () => { polls += 1; return polls > 2; },
  });

  assert.equal(out.ok, true);
  assert.equal(out.action, 'none');
});

test('an undrawn pane is not mistaken for a healthy one', () => {
  // A blank screen has no box, so it classifies as "none" — but nothing has been
  // drawn on it yet. Ending the wait there hands a CLI that is still starting
  // to the session check, which is too short a window to catch a cold start.
  const r = rig({ reads: ['', '', '', CLAUDE_IDLE] });
  const out = recoverStartupScreen({
    name: 'impl',
    cwd: CWD,
    options: r.options,
    env: { ...r.env, CATALYST_DISPATCH_SCREEN_ATTEMPTS: '8' },
  });

  assert.equal(out.ok, true);
  assert.equal(r.calls('agent read').length, 4, 'the blank frames must not end the wait');
  assert.notEqual(extractComposer(out.screen.text), null, 'the wait ends on a drawn composer');
});

test('the trust prompt is answered as soon as it appears', () => {
  const r = rig({ reads: [SHELL_STARTUP_NOISE, TRUST_PROMPT, CLAUDE_IDLE] });
  const out = recoverStartupScreen({ name: 'impl', cwd: CWD, options: r.options, env: r.env });

  assert.equal(out.ok, true);
  assert.equal(out.action, 'trust-enter');
  assert.deepEqual(r.calls('agent send-keys')[0].slice(2), ['impl', 'enter']);
});

test('a gate that outlasts the window is reported, with the screen', () => {
  const r = rig({ reads: [UNKNOWN_GATE] });
  const out = recoverStartupScreen({
    name: 'impl',
    cwd: CWD,
    options: r.options,
    env: { ...r.env, CATALYST_DISPATCH_SCREEN_ATTEMPTS: '4' },
  });

  assert.equal(out.ok, false);
  assert.match(out.reason, /no matching screen_answers entry/);
  assert.match(out.screen.text, /Select login method/);
  assert.equal(r.calls('agent read').length, 4, 'the whole window is spent before calling it a gate');
});

// The ghost-text probe: incident 2026-08-01-dispatch-steer-ghost-text-refused.
// A keystroke is the only way to tell a rendering from a buffer, so the probe is
// bounded by what it can undo — it never takes a character it cannot type back.

test('a composer unmoved by a backspace is holding a rendering, not text', () => {
  const r = rig({ agentGet: CLAUDE_GET, reads: [CLAUDE_GHOST_QUEUED, CLAUDE_GHOST_QUEUED] });
  const probe = probeGhostText('orchestrator', {
    composer: extractComposer(CLAUDE_GHOST_QUEUED),
    env: r.env,
    options: r.options,
  });

  assert.equal(probe.ghost, true, probe.reason);
  assert.equal(probe.probed, true);
  assert.equal(r.calls('pane send-text').length, 0);
});

test('a composer that shortens is real input, and the character goes back', () => {
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_FOREIGN_TEXT, CLAUDE_FOREIGN_TEXT],
    readsAfterBackspace: [CLAUDE_FOREIGN_TEXT_BACKSPACED, CLAUDE_FOREIGN_TEXT_BACKSPACED],
  });
  const probe = probeGhostText('orchestrator', {
    composer: extractComposer(CLAUDE_FOREIGN_TEXT),
    env: r.env,
    options: r.options,
  });

  assert.equal(probe.ghost, false);
  assert.equal(probe.restored, true, probe.reason);
  assert.deepEqual(r.calls('pane send-text')[0].slice(2), ['w6:p5', 'g']);
});

test('a parked paste is never probed: one backspace drops all of it', () => {
  const r = rig({ agentGet: CLAUDE_GET, reads: [CLAUDE_PARKED_PASTE, CLAUDE_PARKED_PASTE] });
  const probe = probeGhostText('meta', {
    composer: extractComposer(CLAUDE_PARKED_PASTE),
    env: r.env,
    options: r.options,
  });

  assert.equal(probe.ghost, false);
  assert.equal(probe.probed, false);
  assert.equal(r.calls('agent send-keys').length, 0, 'a chip a character cannot restore is left alone');
});

test('a read that dies after the probe is a verdict, not a thrown error', () => {
  // Delivery is already under way against a live agent by the time the probe
  // runs, so a herdr call that dies has to come back as a refusal the caller can
  // file — never as an exception out of the middle of a send.
  const r = rig({
    agentGet: CLAUDE_GET,
    reads: [CLAUDE_FOREIGN_TEXT, CLAUDE_FOREIGN_TEXT],
    readFailsAfterBackspace: true,
  });
  const probe = probeGhostText('orchestrator', {
    composer: extractComposer(CLAUDE_FOREIGN_TEXT),
    env: r.env,
    options: r.options,
  });

  assert.equal(probe.ghost, false, 'an unreadable composer proves nothing, so it stays foreign text');
  assert.equal(probe.restored, false, 'and the caller is told the character never went back');
});

test('no pane to type into means no keystroke at all', () => {
  // The restore channel is resolved before the delete, so a probe that could not
  // put a character back never takes one.
  const r = rig({ reads: [CLAUDE_FOREIGN_TEXT, CLAUDE_FOREIGN_TEXT] });
  const probe = probeGhostText('orchestrator', {
    composer: extractComposer(CLAUDE_FOREIGN_TEXT),
    env: r.env,
    options: r.options,
  });

  assert.equal(probe.ghost, false);
  assert.equal(probe.probed, false);
  assert.equal(r.calls('agent send-keys').length, 0);
});

test('a caller-named screen is answered on its text, never on startup noise', () => {
  const r = rig({ reads: [SHELL_STARTUP_NOISE, UNKNOWN_GATE] });
  const out = recoverStartupScreen({
    name: 'impl',
    cwd: CWD,
    screenAnswers: { 'Select login method': '1 enter' },
    options: r.options,
    env: { ...r.env, CATALYST_DISPATCH_SCREEN_ATTEMPTS: '4' },
  });

  assert.equal(out.ok, true);
  assert.equal(out.action, 'screen-answer:Select login method');
  assert.deepEqual(r.calls('agent send-keys')[0].slice(2), ['impl', '1', 'enter']);
});

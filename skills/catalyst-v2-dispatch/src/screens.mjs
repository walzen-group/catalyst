// Interactive-screen detection and the one recovery the tool is allowed to make.
// A dialog is dismissed only when the tool can attribute it: the workspace trust
// prompt naming the cwd it just asked for, or a screen the caller named in
// screen_answers. Everything else is reported and fails the agent.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { herdrText, herdrJson, herdrRun, parseReply } from './herdr.mjs';
import { collapse } from './ledger.mjs';
import { numericEnv, sleep } from './timing.mjs';

const BOX_CHARS = /[│╭╰┌└]/;
// Claude Code has reworded its workspace-trust prompt at least once and draws
// the current one with rules rather than a box, so the marker is a set and
// every wording seen in the wild stays in it.
const TRUST_MARKERS = [
  /trust the files in this folder/i,
  /is this a project you created or one you trust/i,
  /yes, I trust this folder/i,
];
// A highlighted first option is what a keyboard-driven select looks like when
// nothing draws a border around it. Only consulted once no composer is on
// screen, so ordinary numbered output in a transcript cannot reach it.
const CHOICE_GATE = /^\s*❯\s*1\.\s+\S/m;
const RULE_LINE = /^[^\p{L}\p{N}|]*─[^\p{L}\p{N}|]*$/u;

// A CLI that has not drawn anything yet shows whatever the shell left on the
// screen, and shells are full of boxes: direnv, a nix banner, a pnpm update
// notice. So the startup screen is polled until the CLI is demonstrably up
// rather than classified once at the earliest possible moment. The window is
// spent only when something really is gating the keyboard.
const DEFAULT_SCREEN_ATTEMPTS = 120;
const DEFAULT_SCREEN_INTERVAL_MS = 250;
const DEFAULT_COMPOSER_ATTEMPTS = 80;
const DEFAULT_COMPOSER_INTERVAL_MS = 250;

/** Absolute paths mentioned anywhere in a captured screen. */
export function screenPaths(text) {
  const found = new Set();
  for (const match of String(text ?? '').matchAll(/\/[^\s│╮╯|]+/g)) {
    found.add(match[0].replace(/[.,)]+$/, ''));
  }
  return [...found];
}

/**
 * What a captured screen is, from the tool's point of view.
 *
 * Box-drawing characters alone do not make a dialog: startup output draws
 * plenty of them (a pnpm update notice, a nix banner, a CLI's own welcome
 * card), and reading one as a keyboard gate aborts a healthy launch. A located
 * composer settles it the other way — a CLI drawing its prompt is taking
 * keyboard input, so nothing is gating it.
 *
 * @returns {{kind: 'trust'|'question'|'other'|'none', names_cwd: boolean, paths: string[], text: string}}
 */
export function classifyScreen(text, requestedCwd) {
  const raw = String(text ?? '');
  const paths = screenPaths(raw);
  const namesCwd = typeof requestedCwd === 'string' && requestedCwd !== '' && raw.includes(requestedCwd);

  if (TRUST_MARKERS.some((marker) => marker.test(raw))) {
    return { kind: 'trust', names_cwd: namesCwd, paths, text: raw };
  }
  const dialog = raw.split('\n').some((line) => BOX_CHARS.test(line)) || CHOICE_GATE.test(raw);
  if (extractComposer(raw) !== null) return { kind: 'none', names_cwd: namesCwd, paths, text: raw };
  if (!dialog) return { kind: 'none', names_cwd: namesCwd, paths, text: raw };
  if (raw.includes('?')) return { kind: 'question', names_cwd: namesCwd, paths, text: raw };
  return { kind: 'other', names_cwd: namesCwd, paths, text: raw };
}

/**
 * The composer block: the lines between the last two horizontal rules of a
 * capture, the first of which carries the prompt marker. Null when the terminal
 * is not showing a composer at all (a dialog is up, or the capture is short).
 */
export function extractComposer(text) {
  const lines = String(text ?? '').split('\n');
  const rules = [];
  lines.forEach((line, index) => {
    if (line.includes('─') && RULE_LINE.test(line)) rules.push(index);
  });
  if (rules.length < 2) return null;
  const top = rules[rules.length - 2];
  const bottom = rules[rules.length - 1];
  if (!(lines[top + 1] ?? '').startsWith('❯')) return null;
  return lines
    .slice(top + 1, bottom)
    .map((line) => line.replace(/^❯/, ''))
    .join('\n');
}

/**
 * The omp composer line. omp draws its input buffer as the bottom bar of the
 * status box: the last line of the visible screen, framed `╰─ <text> ─╯`
 * (captured live 2026-08-03). Text between the frame ends is a live draft;
 * a bar holding only whitespace is a quiet composer. Null when the last line
 * is not the bar at all, so the caller fails honestly instead of sending
 * blind into a screen it cannot read.
 * @returns {string|null} the bar's inner text, untrimmed; null when the last
 *          line is not an omp bottom bar
 */
export function ompComposerText(screen) {
  const lines = String(screen ?? '').split('\n');
  // The capture can end with the pane's cursor row or a trailing newline, so
  // the bar is the last populated line, not necessarily the last line.
  let last = '';
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim() !== '') {
      last = lines[i];
      break;
    }
  }
  if (last === '') return null;
  const match = /^\s*╰─(.*)─╯\s*$/.exec(last);
  return match === null ? null : match[1];
}

/**
 * The lines a CLI draws live rather than scrolls: the turn footer directly
 * above the composer, and the status lines below it. A capture holds the whole
 * visible buffer, so anything read out of the transcript body is quoted text,
 * not a live reading.
 * @returns {string[]} populated lines only
 */
export function liveIndicatorLines(text) {
  const lines = String(text ?? '').split('\n');
  const populated = (list) => list.filter((line) => line.trim() !== '');
  const rules = [];
  lines.forEach((line, index) => {
    if (line.includes('─') && RULE_LINE.test(line)) rules.push(index);
  });
  // No composer block on screen: the last populated line is all that is live.
  if (rules.length < 2) return populated(lines).slice(-1);
  const top = rules[rules.length - 2];
  const bottom = rules[rules.length - 1];
  return [
    ...populated(lines.slice(0, top)).slice(-1),
    ...populated(lines.slice(bottom + 1)),
  ];
}

export function readVisible(name, options = {}) {
  return herdrText(['agent', 'read', name, '--source', 'visible', '--format', 'text'], options);
}

export function readRecent(name, options = {}) {
  return herdrText(['agent', 'read', name, '--lines', '200', '--source', 'recent', '--format', 'text'], options);
}

/**
 * Read the composer until two consecutive captures agree: the snapshot lags a
 * paste by a poll, so one read can catch the terminal mid-render.
 */
/**
 * Wait for a composer to be drawn at all. Answering a startup screen returns
 * the moment the keystroke is sent, and a CLI redrawing after it reaches
 * `interactive_ready` — and publishes its session — a beat before its prompt is
 * on screen. Reading once there sees no composer and calls a healthy agent
 * unreachable. Returns the last read either way; the caller judges a null.
 */
export function waitForComposer(name, { env = process.env, options = {} } = {}) {
  const attempts = Math.max(1, numericEnv(env, 'CATALYST_DISPATCH_COMPOSER_ATTEMPTS', DEFAULT_COMPOSER_ATTEMPTS));
  const interval = numericEnv(env, 'CATALYST_DISPATCH_COMPOSER_INTERVAL_MS', DEFAULT_COMPOSER_INTERVAL_MS);
  let last = { raw: '', composer: null };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = readComposerSettled(name, options);
    if (last.composer !== null) return last;
    if (attempt + 1 < attempts) sleep(interval);
  }
  return last;
}

// A parked paste is a single chip standing in for the whole text: one backspace
// drops all of it and one character could never put it back. Both wordings —
// Claude Code's "[Pasted text #1 +43 lines]" and omp's "[Paste #1, +107 lines]"
// — are excluded from the probe for that reason.
const PASTE_CHIP_ANY = /\[Paste(?:d text)? #\d+/i;
const PROBE_KEY = 'backspace';

/** The pane a herdr agent is drawn in, or null when it cannot be read. */
function paneIdFor(name, options) {
  const run = herdrRun(['agent', 'get', name], options);
  const body = parseReply(run.stdout) ?? parseReply(run.stderr);
  const pane = body?.result?.agent?.pane_id;
  return typeof pane === 'string' && pane !== '' ? pane : null;
}

/**
 * The one character a backspace removed, or null when the two readings do not
 * differ by exactly that. The cursor sits where the character was, so typing it
 * back at that point restores the buffer verbatim.
 */
export function removedCharacter(before, after) {
  const from = String(before ?? '');
  const to = String(after ?? '');
  if (to.length !== from.length - 1) return null;
  let at = 0;
  while (at < to.length && from[at] === to[at]) at += 1;
  if (from.slice(0, at) + from.slice(at + 1) !== to) return null;
  return from[at];
}

/**
 * Whether composer text is a rendering rather than an editable buffer.
 *
 * Claude Code draws hints where the prompt goes — `Press up to edit queued
 * messages` while it is mid-turn with something queued. A capture cannot tell
 * that from text a user parked, and read as parked text it refuses a delivery
 * that nobody's input was in the way of (incident
 * 2026-08-01-dispatch-steer-ghost-text-refused). Nothing here matches the
 * wording: the question asked is whether a buffer is there at all, so any hint
 * answers it, including ones not yet written.
 *
 * The probe is a keystroke, so it is bounded by what it can undo. The pane to
 * type into is resolved *before* the backspace is sent — a probe that could not
 * put a character back never takes one — and a parked paste is never probed at
 * all. Text that shortens is real: the character goes straight back and the
 * caller refuses as it always did.
 *
 * @returns {{ghost: boolean, probed: boolean, restored: boolean, reason: string}}
 */
export function probeGhostText(name, { composer, env = process.env, options = {} } = {}) {
  const before = String(composer ?? '');
  const no = (reason, extra = {}) => ({ ghost: false, probed: false, restored: true, reason, ...extra });

  if (collapse(before) === '') return no('the composer is already empty; there is nothing to probe');
  if (PASTE_CHIP_ANY.test(before)) {
    return no('a parked paste is one chip: a backspace would drop all of it and one character could not put it back');
  }
  const pane = paneIdFor(name, options);
  if (pane === null) return no('the pane could not be read, so a deleted character could not be typed back');

  const probe = herdrRun(['agent', 'send-keys', name, PROBE_KEY], options);
  if (probe.status !== 0) return no(`the probe keystroke failed: herdr exited ${probe.status ?? 'without running'}`);

  // The snapshot lags a keystroke, so the read is settled and given the same
  // redraw window a composer poll uses.
  sleep(numericEnv(env, 'CATALYST_DISPATCH_COMPOSER_INTERVAL_MS', DEFAULT_COMPOSER_INTERVAL_MS));
  // A delivery is already under way against a live agent here, so a herdr call
  // that dies is a verdict to hand back, not an exception to throw through it.
  let after;
  try {
    after = readComposerSettled(name, options).composer;
  } catch (error) {
    return { ghost: false, probed: true, restored: false, reason: `the composer could not be read after the probe keystroke: ${error.message}` };
  }
  if (after === null) {
    return {
      ghost: false,
      probed: true,
      restored: false,
      reason: 'the composer could not be located after the probe keystroke',
    };
  }
  if (collapse(after) === collapse(before)) {
    return {
      ghost: true,
      probed: true,
      restored: true,
      reason: 'the composer did not shorten under a backspace, so it is showing a hint and holds no editable text',
    };
  }

  // Real input. Put back exactly what came out, at the point it came out of.
  const removed = removedCharacter(before, after);
  if (removed === null) {
    return {
      ghost: false,
      probed: true,
      restored: false,
      reason: 'the composer changed under the probe but not by a single character, so nothing was typed back',
    };
  }
  const back = herdrRun(['pane', 'send-text', pane, removed], options);
  return {
    ghost: false,
    probed: true,
    restored: back.status === 0,
    reason: back.status === 0
      ? 'the composer shortened under a backspace, so it holds real input; the character was typed back'
      : 'the composer shortened under a backspace, so it holds real input; the character could not be typed back',
  };
}

export function readComposerSettled(name, options = {}) {
  let previous = null;
  let current = '';
  for (let tries = 0; tries < 4; tries += 1) {
    current = readRecent(name, options);
    if (current !== '' && current === previous) break;
    previous = current;
  }
  return { raw: current, composer: extractComposer(current) };
}

/**
 * The raw visible screen, settled the same way: read until two consecutive
 * captures agree, so a read taken mid-render is not classified. Used by the omp
 * delivery path, which has no composer block to locate and reads the whole
 * visible screen to spot a parked-paste chip.
 */
export function readVisibleSettled(name, options = {}) {
  let previous = null;
  let current = '';
  for (let tries = 0; tries < 4; tries += 1) {
    current = readVisible(name, options);
    if (current !== '' && current === previous) break;
    previous = current;
  }
  return current;
}

/**
 * The caller's answer for this screen. While the startup window is still open
 * only a literal text match counts: a key naming a screen *kind* would fire on
 * transient startup output, which is not a screen the caller ever saw.
 */
export function answerFor(screen, screenAnswers, { kindKeys = true } = {}) {
  for (const [key, keys] of Object.entries(screenAnswers ?? {})) {
    if (screen.text.includes(key)) return { key, keys };
    if (kindKeys && key === screen.kind) return { key, keys };
  }
  return null;
}

/**
 * Resolve whatever keyboard-gated screen a freshly started agent is sitting on.
 *
 * Polled, not sampled once. A CLI reaches `interactive_ready` before it has
 * drawn a thing, so the first capture is usually the shell's own startup output
 * — and that output is not evidence of anything. The loop ends the moment the
 * agent is demonstrably up (`isReady`, or a composer on screen), answers a
 * screen it can attribute as soon as one appears, and only reports a gate once
 * the whole window has been spent still looking at one.
 *
 * @param {{name, cwd, screenAnswers, options, env, isReady}} input
 *        isReady: optional predicate, true once the CLI published its session
 * @returns {{ok: boolean, action: string, screen: object, reason?: string}}
 */
export function recoverStartupScreen({
  name,
  cwd,
  screenAnswers = {},
  options = {},
  env = process.env,
  isReady = null,
}) {
  const attempts = Math.max(1, numericEnv(env, 'CATALYST_DISPATCH_SCREEN_ATTEMPTS', DEFAULT_SCREEN_ATTEMPTS));
  const interval = numericEnv(env, 'CATALYST_DISPATCH_SCREEN_INTERVAL_MS', DEFAULT_SCREEN_INTERVAL_MS);
  const ready = () => (typeof isReady === 'function' ? isReady() === true : false);

  let screen = classifyScreen('', cwd);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (ready()) return { ok: true, action: 'none', screen };

    screen = classifyScreen(readVisible(name, options), cwd);

    if (screen.kind === 'trust') {
      if (!screen.names_cwd) {
        return {
          ok: false,
          action: 'none',
          screen,
          reason: `trust screen names a different path than the requested cwd (${screen.paths.join(', ') || 'no path read'}); the tool never dismisses it`,
        };
      }
      herdrJson(['agent', 'send-keys', name, 'enter'], options);
      return { ok: true, action: 'trust-enter', screen };
    }

    // A located composer says the CLI is up and taking input; nothing is gated.
    // An unremarkable screen with no composer says nothing at all — a pane that
    // has not been drawn on yet looks exactly like one that is fine — so it is
    // not an exit, it is a reason to keep waiting.
    if (screen.kind === 'none' && extractComposer(screen.text) !== null) {
      return { ok: true, action: 'none', screen };
    }

    const answer = answerFor(screen, screenAnswers, { kindKeys: false });
    if (answer !== null) {
      herdrJson(['agent', 'send-keys', name, ...answer.keys.split(/\s+/).filter(Boolean)], options);
      return { ok: true, action: `screen-answer:${answer.key}`, screen };
    }

    if (attempt + 1 < attempts) sleep(interval);
  }

  // The window is spent and the same screen is still up: now it is a gate.
  if (ready()) return { ok: true, action: 'none', screen };

  const answer = answerFor(screen, screenAnswers);
  if (answer !== null) {
    herdrJson(['agent', 'send-keys', name, ...answer.keys.split(/\s+/).filter(Boolean)], options);
    return { ok: true, action: `screen-answer:${answer.key}`, screen };
  }

  if (screen.kind === 'question') {
    return {
      ok: false,
      action: 'none',
      screen,
      reason: 'a fresh agent is sitting on a pending question; answering it is the caller\'s judgment',
    };
  }

  // Nothing gating, just nothing drawn. Not this step's failure to report: the
  // session wait says whether the CLI came up, and says it far more precisely.
  if (screen.kind === 'none') return { ok: true, action: 'none', screen };

  return {
    ok: false,
    action: 'none',
    screen,
    reason: 'keyboard-gated screen with no matching screen_answers entry',
  };
}

/** A short, log-friendly rendering of a screen for a failure record. */
export function screenSpecimen(screen) {
  return collapse(screen?.text ?? '').slice(0, 2000);
}

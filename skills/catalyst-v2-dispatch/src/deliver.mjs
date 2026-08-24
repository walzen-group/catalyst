// Brief delivery, per harness. Both paths issue `herdr agent prompt ... --wait
// --until working`: herdr's atomic submit, which also confirms the agent picked
// the prompt up (idle -> working) instead of returning the instant the bytes
// were written. They diverge only on what a stall means.
//   - claude: the swallowed-Enter protocol absorbed from
//     catalyst-multiplexer-agent-ops/catalyst-herdr-claude-prompt — composer
//     empty before the send, Enter after a stall only on text the tool can
//     prove is its own. A large paste parks as a placeholder and one Enter
//     releases it.
//   - omp and every other CLI: herdr sets screen_detection_skipped, so there is
//     no composer block of claude's shape to read, but omp draws its input
//     buffer as the status box's bottom bar (framed `╰─ <text> ─╯`) or, from
//     18.x, as a `❯` editor above a rule, so a live draft is observable in
//     either. The pre-send check reads that composer state and refuses over
//     non-empty text: a send appends to the buffer and submits the draft with
//     the text (incident
//     2026-08-03-steer-composer-interference), so the delivery holds with the
//     draft as specimen until the composer is quiet. herdr's confirmed submit
//     then proves a clean landing. On a stall the tool reads the raw
//     visible screen: omp can park a large paste as a chip ("[Paste #1, +107
//     lines]", worded unlike Claude's placeholder), and when that chip is its
//     own parked paste it presses Enter on the same backoff until the chip
//     clears and the agent reaches working. A stall that never shows a chip is
//     checked against the agent's own session transcript, polled over a bounded
//     window: a submitted user message with the sent text proves the stall was
//     a confirmation blind spot (herdr watches a state transition, so a prompt
//     delivered to an agent already working comes back stalled anyway), and the
//     delivery is recorded from that evidence. The window exists because
//     opencode can write a queued prompt into the jsonl only when the turn
//     ends, minutes after the stall (incident
//     2026-08-04-steer-delivery-false-negative). The same session proof guards
//     retries before anything is sent: a re-steer over a session that already
//     shows the exact text is recorded and skipped, never re-sent. Bounded like
//     claude: a chip that never clears within the attempts, or a stall with no
//     chip and no session proof within the window, stays the honest parked
//     failure, never papered over as delivered.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { readFileSync } from 'node:fs';

import { herdrRun, parseReply } from './herdr.mjs';
import { collapse, findDelivery, hasSession, recordDelivery } from './ledger.mjs';
import { ompComposerText, probeGhostText, readComposerSettled, readVisibleSettled, waitForComposer } from './screens.mjs';
import { numericEnv, sleep } from './timing.mjs';

export const MAX_ENTER_ATTEMPTS = 3;
export const SEND_TIMEOUT_MS = 15000;
// opencode writes a prompt queued behind a running turn into the session jsonl
// when the turn ends, which can be minutes after herdr declared the stall
// (incident 2026-08-04-steer-delivery-false-negative: failure filed 21:46:08,
// session write 21:48:39). A chip-less stall therefore polls the session over
// this window before failing, so a delivered prompt is not misreported as an
// honest parked failure. Bounded: a session that never shows the text still
// fails, and a retry never re-sends text the session already proves submitted.
export const SESSION_PROOF_WINDOW_MS = 180000;
export const SESSION_PROOF_INTERVAL_MS = 5000;
// The pinned catalyst mandate injected ahead of every dispatch brief (user
// directive 2026-08-04): a launched agent must load the bootstrap and its role
// skill before the brief, and no orchestrator can forget it because the tool
// prepends it. It also names the agent (user directive 2026-08-04, incident
// 2026-08-04-agent-self-identity): a session must know its own roster name so
// a roster read classifies its own entry as self instead of another agent.
// Skills load through the harness skill mechanism (skill:// URIs), never by
// filesystem path, so the harness owns routing, invocation, and provenance.
// Steer deliveries are mid-session traffic and carry no mandate.
const MANDATE_LINES = [
  'CATALYST MANDATE: you are <identity>. Before any other action, load',
  'the catalyst bootstrap skill (skill://catalyst-v2) and, through the',
  'harness skill mechanism, the skill that owns your role; then follow',
  'the brief that follows.',
];

/**
 * The catalyst mandate, with the agent's identity substituted. `name` is the
 * agent's roster name, from the dispatch input; when absent the mandate falls
 * back to the unnamed form.
 */
export function catalystMandate(env = process.env, name = null) {
  const identity = name === null || name === '' ? 'a catalyst agent' : `a catalyst agent named ${name}`;
  return MANDATE_LINES.join('\n').replace('<identity>', identity);
}
// herdr calls the send stalled on its own 5000 ms observation window, which
// `--timeout` does not widen. Enter therefore gets a backoff of its own —
// doubling, three attempts, ~7s in total — so the release is judged well past
// the window that declared the stall rather than inside it.
export const DEFAULT_ENTER_BACKOFF_MS = 1000;
// Every brief send carries herdr's own landing confirmation: --wait --until
// working returns once herdr has observed the agent pick the prompt up, and a
// stall when it did not. Shared by both harness paths.
const SEND_WAIT_FLAGS = ['--wait', '--until', 'working'];
const STALL_CODES = new Set(['agent_prompt_stalled', 'timeout']);
const PASTE_PLACEHOLDER = /^\[Pasted text #\d+(?: \+\d+ lines?)?\]$/;
// opencode/omp renders a parked paste as a chip, e.g. "[Paste #1, +107 lines]"
// (comma before the count), worded unlike Claude Code's "[Pasted text #1 +43
// lines]". Anywhere on the visible screen, since omp draws no composer block the
// tool can isolate. The comma and the spacing are both tolerated.
const OMP_PASTE_CHIP = /\[Paste #\d+,?\s*\+\d+ lines?\]/i;

/** Whether a captured omp screen is showing a parked-paste chip. */
export function hasOmpParkedChip(screen) {
  return OMP_PASTE_CHIP.test(String(screen ?? ''));
}

/**
 * Whether the agent's own session transcript shows the sent text as a
 * submitted user message. herdr's `--wait` confirmation observes a state
 * transition, so a prompt written into the session of an agent that is already
 * working — or slower than the 5 s observation window to start — comes back
 * `agent_prompt_stalled` anyway, with the text already submitted. The session
 * transcript is the definitive record of submission: a parked paste never
 * appears there as a user message. Any unreadable session is no evidence.
 */
export function sessionShowsSubmitted(sessionPath, text) {
  if (typeof sessionPath !== 'string' || sessionPath === '') return false;
  let raw;
  try {
    raw = readFileSync(sessionPath, 'utf8');
  } catch {
    return false;
  }
  const want = collapse(text);
  if (want === '') return false;
  for (const line of raw.split('\n')) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.type !== 'message') continue;
    const msg = entry.message;
    if (msg?.role !== 'user') continue;
    let content = msg.content;
    if (Array.isArray(content)) {
      content = content
        .map((block) => (typeof block === 'string' ? block : block?.text ?? ''))
        .join(' ');
    }
    if (typeof content === 'string' && collapse(content) === want) return true;
  }
  return false;
}

/** The agent's status out of `herdr agent get`, or null when it cannot be read. */
function agentStatus(name, options) {
  const run = herdrRun(['agent', 'get', name], options);
  const body = parseReply(run.stdout) ?? parseReply(run.stderr);
  return body?.result?.agent?.agent_status ?? null;
}

/**
 * Whether parked composer text is demonstrably the text just sent: the same
 * text on collapsed whitespace, or the placeholder Claude Code renders for a
 * paste. Both the multi-line (`+M lines`) and single-line placeholder forms
 * count; a one-line paste renders without the suffix.
 */
export function isOurParkedText(composer, sentText) {
  const parked = collapse(composer);
  if (parked === '') return false;
  if (PASTE_PLACEHOLDER.test(parked)) return true;
  return parked === collapse(sentText);
}

/**
 * Whether composer text the tool cannot attribute is real input or a rendering
 * it should treat as an empty composer.
 *
 * Claude Code draws hints in the composer area — `Press up to edit queued
 * messages` while it is mid-turn with something queued — and a capture reads
 * them as parked text. Refusing on one holds up a delivery that no one's input
 * was in the way of. The probe (screens.mjs) answers it with a keystroke and
 * restores anything it removed. Everything it cannot prove is a hint stays
 * foreign text, so the attribution rules are untouched: a probe that fails, or
 * one there was no safe way to run, refuses exactly as before.
 *
 * @returns {{ghost: boolean, note: string}} note: '' unless the refusal owes the
 *          caller a word about the probe itself
 */
function ghostComposer(name, composer, env, options) {
  const probe = probeGhostText(name, { composer, env, options });
  if (probe.ghost) return { ghost: true, note: '' };
  return { ghost: false, note: probe.restored ? '' : `; ${probe.reason}` };
}

/** The error code out of a herdr reply body, whole or line by line. */
function replyCode(text) {
  const whole = parseReply(text);
  if (whole?.error?.code) return whole.error.code;
  const lines = String(text ?? '').split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const parsed = parseReply(lines[i].trim());
    if (parsed?.error?.code) return parsed.error.code;
  }
  return null;
}

/**
 * herdr reports a failed send on **stderr**, leaving stdout empty. Reading only
 * stdout made every stall look like an unrecognized failure and left the
 * swallowed-Enter recovery below unreachable.
 */
export function stallCode(run) {
  return replyCode(run?.stdout) ?? replyCode(run?.stderr);
}

function transcript(run) {
  return { argv: run.argv, status: run.status, stdout: run.stdout, stderr: run.stderr };
}

/**
 * A composer read that hands back a failure instead of throwing: a herdr call
 * that dies mid-delivery has to land in the result document like any other
 * failure, since the agent it belongs to is already live.
 */
function settledComposer(name, options, read = readComposerSettled) {
  try {
    return { ok: true, ...read(name, options) };
  } catch (error) {
    return { ok: false, message: error.message, herdr: error.toJSON?.() ?? null };
  }
}

function sendConfirmed(name, text, options) {
  return herdrRun(
    ['agent', 'prompt', name, text, ...SEND_WAIT_FLAGS, '--timeout', String(SEND_TIMEOUT_MS)],
    options,
  );
}

/**
 * Deliver one brief to one live agent.
 * @returns {{status: 'delivered'|'skipped'|'refused'|'failed', attempts: number,
 *            specimen?: string, reason?: string, herdr?: object}}
 */
export function deliver({ name, cli, session, text, verb = 'dispatch', mandateMode = 'injected', env = process.env, options = {} }) {
  if (typeof text !== 'string' || text === '') {
    return { status: 'failed', attempts: 0, text, reason: 'brief text is empty' };
  }

  // The mandate rides only on new sessions, and only under the injected mode:
  // a dispatch delivery opens with it, and the brief follows verbatim after a
  // blank line. A caller-owned delivery carries the supplied brief unchanged —
  // the caller owns the complete prompt, so no mandate is prepended. The text
  // below this point is the full delivered text, so the send, the attribution
  // checks, and the ledger all see what the agent actually received.
  if (verb === 'dispatch' && mandateMode !== 'caller_owned') {
    text = `${catalystMandate(env, name)}\n\n${text}`;
  }

  // Without a session there is nothing to key the ledger on, so a delivery can
  // neither be deduplicated nor attributed back to this tool afterwards.
  if (!hasSession(session)) {
    return {
      status: 'failed',
      attempts: 0,
      text,
      reason: 'the agent has no session, so this delivery could be neither recorded nor attributed',
    };
  }

  const force = env.CATALYST_DISPATCH_PROMPT_FORCE === '1';
  if (!force && findDelivery(session, text, env) !== null) {
    return { status: 'skipped', attempts: 0, text, reason: 'identical text already delivered to this session' };
  }
  // A retry after a false failure must not re-send text the session already
  // proves submitted: the failure may have been a confirmation blind spot with
  // the prompt queued and written into the session later (incident
  // 2026-08-04-steer-delivery-false-negative, repeating the re-steer pattern
  // of 2026-08-01-dispatch-steer-reported-failure-after-delivery). The
  // transcript is the record of submission — a parked paste never appears
  // there as a user message — so a session match closes the retry without a
  // second send. A claude session id is not a file, so this check no-ops there
  // exactly like the stall proof.
  if (!force && sessionShowsSubmitted(session, text)) {
    recordDelivery({ agent: name, session, text, verb, env });
    return { status: 'skipped', attempts: 0, text, reason: 'the agent session already shows this exact text submitted, so the delivery is confirmed from the session and nothing was re-sent' };
  }

  if (cli !== 'claude') {
    // Composer-state hold before anything is sent. herdr writes the prompt into
    // the agent's own input buffer, so a live draft there is appended to and
    // submitted along with the text — the user's in-progress message goes out
    // mangled (incident 2026-08-03-steer-composer-interference). omp draws the
    // buffer as the status box's bottom bar or, from 18.x, as a `❯` editor
    // above a rule; either way the draft is observable where claude's composer
    // block is not: non-empty text is live input and the delivery holds with
    // the draft as specimen, mirroring the claude refusal for foreign parked
    // text. No composer shape at all means the state is unreadable, which
    // fails honestly - nothing is sent blind.
    let screen;
    try {
      screen = readVisibleSettled(name, options);
    } catch (error) {
      return {
        status: 'failed',
        attempts: 0,
        text,
        reason: `the omp screen could not be read before the send: ${error.message}`,
        herdr: error.toJSON?.() ?? null,
      };
    }
    const draft = ompComposerText(screen);
    if (draft === null) {
      return {
        status: 'failed',
        attempts: 0,
        text,
        reason: 'could not locate the omp composer bar; the agent may be on a dialog',
        specimen: collapse(screen).slice(0, 2000),
      };
    }
    if (collapse(draft) !== '') {
      return {
        status: 'refused',
        attempts: 0,
        text,
        reason: 'the omp composer already held live input before anything was sent',
        specimen: collapse(draft),
      };
    }
    // Composer quiet; herdr's confirmed submit is the first proof of landing:
    // delivered the moment herdr saw the working transition. A stall is not
    // the end of it, though: omp can leave a large paste parked as a chip with
    // the agent idle, the same failure claude's Enter-recovery handles at the
    // composer. So a stall falls through to the omp park recovery below rather
    // than failing outright.
    const run = sendConfirmed(name, text, options);
    if (run.status === 0) {
      recordDelivery({ agent: name, session, text, verb, env });
      return { status: 'delivered', attempts: 1, text };
    }
    const code = stallCode(run);
    if (!STALL_CODES.has(code)) {
      return { status: 'failed', attempts: 1, text, reason: 'herdr agent prompt failed', herdr: transcript(run) };
    }
    return recoverOmpPark({ name, session, text, verb, env, options, run });
  }

  // The pre-send read waits for the composer; every read after it does not,
  // because by then the tool has already seen one.
  const before = settledComposer(name, options, (agent, opts) => waitForComposer(agent, { env, options: opts }));
  if (!before.ok) {
    return {
      status: 'failed',
      attempts: 0,
      text,
      reason: `the composer could not be read before the send: ${before.message}`,
      herdr: before.herdr,
    };
  }
  if (before.composer === null) {
    return {
      status: 'failed',
      attempts: 0,
      text,
      reason: 'could not locate the composer; the agent may be on a dialog',
      specimen: collapse(before.raw).slice(0, 2000),
    };
  }
  if (collapse(before.composer) !== '') {
    // Text on screen is not the same thing as text in the buffer. A hint drawn
    // where the prompt goes is not input, and a composer holding only that is
    // effectively empty, so the send proceeds over it.
    const hint = ghostComposer(name, before.composer, env, options);
    if (!hint.ghost) {
      return {
        status: 'refused',
        attempts: 0,
        text,
        reason: `the composer already held text before anything was sent${hint.note}`,
        specimen: collapse(before.composer),
      };
    }
  }

  const run = sendConfirmed(name, text, options);
  if (run.status === 0) {
    recordDelivery({ agent: name, session, text, verb, env });
    return { status: 'delivered', attempts: 1, text };
  }

  const code = stallCode(run);
  if (!STALL_CODES.has(code)) {
    return { status: 'failed', attempts: 1, reason: 'herdr agent prompt failed', herdr: transcript(run) };
  }

  const backoff = numericEnv(env, 'CATALYST_DISPATCH_ENTER_BACKOFF_MS', DEFAULT_ENTER_BACKOFF_MS);
  let attempts = 0;
  for (;;) {
    const seen = settledComposer(name, options);
    if (!seen.ok) {
      return {
        status: 'failed',
        attempts,
        text,
        reason: `the composer could not be read after "${code}": ${seen.message}`,
        herdr: seen.herdr,
      };
    }
    if (seen.composer === null) {
      return {
        status: 'failed',
        attempts,
        text,
        reason: `could not locate the composer after "${code}"`,
        specimen: collapse(seen.raw).slice(0, 2000),
      };
    }
    // An emptied composer means the paste was submitted after all: it was empty
    // before the send, so nothing else could have consumed it.
    if (collapse(seen.composer) === '') {
      recordDelivery({ agent: name, session, text, verb, env });
      return { status: 'delivered', attempts, text };
    }
    if (attempts >= MAX_ENTER_ATTEMPTS) {
      return {
        status: 'failed',
        attempts,
        text,
        reason: `the prompt was never consumed after ${MAX_ENTER_ATTEMPTS} Enter attempts`,
        specimen: collapse(seen.composer),
      };
    }
    if (!isOurParkedText(seen.composer, text)) {
      // The hint Claude Code draws while it is mid-turn with something queued
      // appears *because* the prompt was taken: herdr writes it, a working agent
      // never transitions, and the stall is declared over a composer that is
      // showing a rendering rather than holding anything. A composer with no
      // editable text in it is the empty composer above, and it was empty before
      // the send, so nothing else could have consumed the prompt.
      const hint = ghostComposer(name, seen.composer, env, options);
      if (!hint.ghost) {
        return {
          status: 'refused',
          attempts,
          text,
          reason: `parked text is not the prompt that was sent${hint.note}`,
          specimen: collapse(seen.composer),
        };
      }
      recordDelivery({ agent: name, session, text, verb, env });
      return {
        status: 'delivered',
        attempts,
        text,
        reason: `herdr reported "${code}", but the composer holds no editable text — only a UI hint — so the prompt was taken`,
      };
    }
    attempts += 1;
    const enter = herdrRun(['agent', 'send-keys', name, 'enter'], options);
    if (enter.status !== 0) {
      return {
        status: 'failed',
        attempts,
        text,
        reason: 'herdr agent send-keys enter failed while releasing the parked prompt',
        herdr: transcript(enter),
      };
    }
    // Give the CLI room to consume the paste before reading it back: a read
    // taken straight after the keystroke sees the composer as it still was.
    sleep(backoff * 2 ** (attempts - 1));
  }
}

/**
 * Confirm an omp agent picked up the released paste: poll `agent get` a few
 * times and take the first working (or already done) reading. A single sample
 * can catch the agent a beat before the state flips, so it is bounded rather
 * than one-shot. Returns the status seen, or null if it never reached one.
 */
function confirmOmpWorking(name, options, env) {
  const tries = Math.max(1, numericEnv(env, 'CATALYST_DISPATCH_OMP_CONFIRM_ATTEMPTS', 5));
  const interval = numericEnv(env, 'CATALYST_DISPATCH_ENTER_BACKOFF_MS', DEFAULT_ENTER_BACKOFF_MS);
  for (let i = 0; i < tries; i += 1) {
    const status = agentStatus(name, options);
    if (status === 'working' || status === 'done') return status;
    if (i + 1 < tries) sleep(interval);
  }
  return null;
}

/**
 * Release a parked omp paste, or fail honestly. omp draws no composer, so the
 * evidence is the raw visible screen: the tool looks for its own paste chip and
 * presses Enter on the shared backoff until the chip clears, then confirms the
 * agent reached working. A stall that never shows a chip is checked against the
 * session transcript, polled over a bounded window — opencode writes a queued
 * prompt into the jsonl when the turn ends, which can lag the stall by minutes
 * (incident 2026-08-04-steer-delivery-false-negative) — and a session match
 * records the delivery. Three outcomes stay honest failures, never delivered: a
 * stall whose session never shows the text within the proof window, a chip that
 * never clears within the attempts, and a chip that clears without the agent
 * reaching working. The attempt cap is `CATALYST_DISPATCH_OMP_ENTER_ATTEMPTS`
 * (default MAX_ENTER_ATTEMPTS; 0 disables recovery so the honest-failure path
 * can be exercised directly); the proof window and poll interval are
 * `CATALYST_DISPATCH_SESSION_PROOF_MS` and
 * `CATALYST_DISPATCH_SESSION_PROOF_INTERVAL_MS`.
 */
function recoverOmpPark({ name, session, text, verb, env, options, run }) {
  const backoff = numericEnv(env, 'CATALYST_DISPATCH_ENTER_BACKOFF_MS', DEFAULT_ENTER_BACKOFF_MS);
  const maxAttempts = numericEnv(env, 'CATALYST_DISPATCH_OMP_ENTER_ATTEMPTS', MAX_ENTER_ATTEMPTS);
  const proofWindow = numericEnv(env, 'CATALYST_DISPATCH_SESSION_PROOF_MS', SESSION_PROOF_WINDOW_MS);
  const proofInterval = numericEnv(env, 'CATALYST_DISPATCH_SESSION_PROOF_INTERVAL_MS', SESSION_PROOF_INTERVAL_MS);
  const code = stallCode(run);
  let attempts = 0;
  let sawChip = false;
  let proofDeadline = null;
  for (;;) {
    let screen;
    try {
      screen = readVisibleSettled(name, options);
    } catch (error) {
      return {
        status: 'failed',
        attempts,
        text,
        reason: `the omp screen could not be read after "${code}": ${error.message}`,
        herdr: error.toJSON?.() ?? transcript(run),
      };
    }

    if (hasOmpParkedChip(screen)) {
      sawChip = true;
      if (attempts >= maxAttempts) {
        return {
          status: 'failed',
          attempts,
          text,
          reason: `the omp paste parked and was never consumed after ${maxAttempts} Enter attempts`,
          specimen: collapse(screen).slice(0, 2000),
        };
      }
      attempts += 1;
      const enter = herdrRun(['agent', 'send-keys', name, 'enter'], options);
      if (enter.status !== 0) {
        return {
          status: 'failed',
          attempts,
          text,
          reason: 'herdr agent send-keys enter failed while releasing the parked omp paste',
          herdr: transcript(enter),
        };
      }
      // Same doubling backoff claude uses: judge the release past the window
      // that declared the stall, not inside it.
      sleep(backoff * 2 ** (attempts - 1));
      continue;
    }

    // No chip on screen. Only a chip the tool actually saw and Entered counts as
    // a recovery; a stall that never showed one is nothing this path can claim,
    // so it stays the honest parked failure the omp send would have reported —
    // unless the session itself proves the text was submitted. herdr writes the
    // prompt into the agent's session and only then watches for a state change,
    // so a target already working (or slower than the observation window to
    // start) is declared stalled with the text already delivered; a parked paste
    // never appears in the session as a user message, so a session match is
    // delivery, not a paper-over. The proof is not sampled once, though:
    // opencode can write a queued prompt into the jsonl only when the turn
    // ends, minutes after the stall (incident
    // 2026-08-04-steer-delivery-false-negative), so the session is polled over
    // a bounded window first. A chip that appears during the window hands over
    // to the Enter recovery at the top of the loop.
    if (!sawChip) {
      if (sessionShowsSubmitted(session, text)) {
        recordDelivery({ agent: name, session, text, verb, env });
        return {
          status: 'delivered',
          attempts,
          text,
          reason: `herdr reported "${code}", but the agent's session shows the text submitted; delivery confirmed from the session`,
          herdr: transcript(run),
        };
      }
      const now = Date.now();
      if (proofDeadline === null) proofDeadline = now + proofWindow;
      if (now >= proofDeadline) {
        return {
          status: 'failed',
          attempts,
          text,
          reason: `the omp prompt stalled, no parked-paste chip appeared on screen, and the session showed no submitted text within the ${proofWindow} ms proof window, so it is reported as an honest parked failure`,
          herdr: transcript(run),
          specimen: collapse(screen).slice(0, 2000),
        };
      }
      sleep(proofInterval);
      continue;
    }

    // The chip cleared after an Enter. Confirm the paste was submitted (agent
    // working) rather than merely discarded before recording the delivery.
    const status = confirmOmpWorking(name, options, env);
    if (status !== null) {
      recordDelivery({ agent: name, session, text, verb, env });
      return { status: 'delivered', attempts, text };
    }
    return {
      status: 'failed',
      attempts,
      text,
      reason: 'the omp paste chip cleared but the agent never reached working, so the paste was not submitted',
      specimen: collapse(screen).slice(0, 2000),
    };
  }
}

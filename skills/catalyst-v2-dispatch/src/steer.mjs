// steer: re-prompt a running agent, safely. Read before send. A blocked agent is
// sitting on an approval or question UI; steer does not drive that UI (herdr
// already sends keys, and a question can want a sequence a flag cannot express),
// it reports the block with a hint to resolve it via herdr and re-steer. It
// never sends into a composer holding text this tool cannot attribute to its own
// delivery ledger. The exit from a refusal is escalation, so there is no
// override flag.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { herdrRun, parseReply } from './herdr.mjs';
import { collapse, isAttributable } from './ledger.mjs';
import { classifyScreen, extractComposer, probeGhostText, readComposerSettled, readVisible, screenSpecimen } from './screens.mjs';
import { deliver } from './deliver.mjs';
import { prescribeWake } from './wake.mjs';
import { priorFailures, recordFailure } from './failures.mjs';

const BLOCKED_STATUSES = new Set(['blocked']);
// A steer leaves the agent working, so it owes the same settle wake a dispatch
// arms; without one the caller has re-prompted an agent nothing will wake them
// on. Overridable per call — the caller re-arms on its own cadence after it
// fires — but never absent.
export const DEFAULT_STEER_WAKE_MS = 900000;

function transcript(run) {
  return { argv: run.argv, status: run.status, stdout: run.stdout, stderr: run.stderr };
}

function agentGet(name, options) {
  const run = herdrRun(['agent', 'get', name], options);
  if (run.status !== 0) return { ok: false, run, reason: `herdr exited ${run.status ?? 'without running'}` };
  const reply = parseReply(run.stdout);
  if (reply === null) return { ok: false, run, reason: 'herdr reply was not JSON' };
  if (reply.error) return { ok: false, run, reason: `herdr error: ${reply.error.code ?? ''} ${reply.error.message ?? ''}`.trim() };
  return { ok: true, run, agent: reply.result?.agent ?? {} };
}

/**
 * What a caller does with a blocked agent. steer will not answer the dialog:
 * herdr already sends keys, and a live question can need a sequence a flag
 * cannot express — a multi-stage dialog wants a beat between selects, and the
 * free-text option is select-then-type. So the block is reported and the caller
 * drives herdr's own controls, then re-steers to deliver the directive.
 */
function herdrResolutionHint(name) {
  return [
    `${name} is blocked on an approval or question screen; steer does not answer it.`,
    `Read it:   herdr agent read ${name}`,
    `Answer it: herdr agent send-keys ${name} <key>   (one key at a time; a multi-stage dialog needs a beat between selects, and the free-text option is select-then-type)`,
    `Or drive it by hand: herdr agent attach ${name}`,
    `Then re-run steer to deliver the directive once the agent is working or idle.`,
  ].join('\n');
}

/**
 * Re-prompt one agent.
 * @param {{agent, text, expect, wakeTimeoutMs, env, options}} input
 * @returns the steer result document
 */
export function steerAgent({
  agent: name,
  text,
  expect = null,
  wakeTimeoutMs = DEFAULT_STEER_WAKE_MS,
  env = process.env,
  options = {},
}) {
  const result = {
    verb: 'steer',
    agent: name,
    status: 'failed',
    text_delivered: null,
    delivery: { status: null, attempts: 0 },
    expect_match: 'unknown',
    status_at_return: null,
    wake: null,
    prior_failures: priorFailures([name], env),
  };

  const file = (step, detail, extra = {}) => {
    recordFailure({ target: name, step, detail, verb: 'steer', env });
    return { ...result, ...extra, failure: { agent: name, step, detail } };
  };

  // Every herdr read below can fail on a live agent, and a steer that throws
  // leaves the caller with no document at all, so each one is caught and filed.
  const read = (fn) => {
    try {
      return { ok: true, value: fn() };
    } catch (error) {
      return { ok: false, message: error.message, herdr: error.toJSON?.() ?? null };
    }
  };

  // 1. Read first: what the agent is doing decides whether a send is allowed.
  const info = agentGet(name, options);
  if (!info.ok) return file('agent_get', info.reason, { herdr_output: transcript(info.run) });
  result.status_at_return = info.agent.agent_status ?? null;

  const seen = read(() => readVisible(name, options));
  if (!seen.ok) return file('agent_read', `agent read failed: ${seen.message}`, { herdr_output: seen.herdr });
  const visible = seen.value;
  const screen = classifyScreen(visible, info.agent.cwd);

  // herdr is the authority on "blocked": it recognizes approval and question
  // UIs, and 01 gates this step on that state. The screen adds the trust prompt,
  // which its own marker identifies. A bare question mark does not qualify: a
  // session transcript quotes plenty (an omp banner tip reads "Did you know?",
  // live 2026-08-01), and refusing on one holds up a healthy agent.
  //
  // A blocked agent is not steered: the directive would land in a dialog, not a
  // composer. steer reports the block and hands back a herdr hint; the caller
  // resolves the question with herdr, then re-steers
  // (incident 2026-08-02-c2d-steer-answer-keys-broken).
  const blocked = BLOCKED_STATUSES.has(result.status_at_return) || screen.kind === 'trust';
  if (blocked) {
    return {
      ...result,
      status: 'blocked',
      question: screenSpecimen(screen),
      hint: herdrResolutionHint(name),
    };
  }

  // 2. The composer must hold nothing this tool did not put there.
  const session = info.agent.agent_session?.value ?? null;
  // A composer the extractor cannot locate holds nothing to attribute: the
  // refusal guards text that is demonstrably parked, so it needs a located one.
  const beforeRead = read(() => readComposerSettled(name, options));
  if (!beforeRead.ok) return file('agent_read', `agent read failed: ${beforeRead.message}`, { herdr_output: beforeRead.herdr });
  const before = beforeRead.value;
  if (before.composer !== null && collapse(before.composer) !== '' && !isAttributable(before.composer, session, env)) {
    // Unless it is nobody's text. Claude Code draws hints where the prompt goes
    // — `Press up to edit queued messages` while it is mid-turn with something
    // queued — and a capture cannot tell a rendering from a buffer. The probe
    // can: text that does not shorten under a backspace was never text
    // (incident 2026-08-01-dispatch-steer-ghost-text-refused). Everything the
    // probe cannot prove is a hint stays someone else's input and is refused.
    if (!probeGhostText(name, { composer: before.composer, env, options }).ghost) {
      return { ...result, status: 'refused', specimen: collapse(before.composer) };
    }
  }

  // 3. Deliver, then read back that the agent consumed it.
  const delivery = deliver({ name, cli: info.agent.agent, session, text, verb: 'steer', env, options });
  result.delivery = { status: delivery.status, attempts: delivery.attempts ?? 0, reason: delivery.reason ?? null };
  if (delivery.status === 'refused') {
    return { ...result, status: 'refused', specimen: delivery.specimen ?? null };
  }
  if (delivery.status === 'failed') {
    return file('brief_delivery', delivery.reason ?? 'delivery failed', {
      specimen: delivery.specimen ?? null,
      herdr_output: delivery.herdr ?? null,
    });
  }
  if (delivery.status === 'skipped') {
    return { ...result, status: 'skipped', text_delivered: null };
  }
  result.text_delivered = text;

  const after = agentGet(name, options);
  if (!after.ok) return file('agent_get', after.reason, { herdr_output: transcript(after.run) });
  result.status_at_return = after.agent.agent_status ?? null;
  const consumedRead = read(() => readComposerSettled(name, options));
  if (!consumedRead.ok) return file('agent_read', `agent read failed: ${consumedRead.message}`, { herdr_output: consumedRead.herdr });
  const consumed = consumedRead.value;
  // A directive queued behind a running turn leaves the same hint on screen, and
  // a hint is not the directive sitting unconsumed. Only text a keystroke can
  // shorten is parked text.
  const composerParked = consumed.composer !== null
    && collapse(consumed.composer) !== ''
    && !probeGhostText(name, { composer: consumed.composer, env, options }).ghost;
  if (composerParked) {
    return file('steer_consumption', `the agent did not consume the directive: ${collapse(consumed.composer).slice(0, 400)}`);
  }
  if (expect) {
    result.expect_match = collapse(consumed.raw).includes(expect);
  }
  result.consumed = true;

  // Record the settle wake this agent owes. The tool prescribes it and never runs
  // it: a wait spawned from here is orphaned and wakes nobody, which is how a
  // steered agent settled unnoticed (wake.mjs). The caller runs the handed-back
  // command as a background job of its own harness. A steer against an agent an
  // existing wait already covers asks for no second wait: the unit is the agent's
  // current work, not the individual re-prompt.
  result.wake = prescribeWake({ name, timeoutMs: wakeTimeoutMs, status: result.status_at_return, env, options });
  result.status = 'ok';
  return result;
}

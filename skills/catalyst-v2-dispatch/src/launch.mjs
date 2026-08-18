// The per-agent launch sequence: tab, start, screen, brief, read-back, wake.
// Sequential and complete per agent — an agent is reported dispatched only once
// the tool has seen it live in the requested cwd, on the brief it delivered,
// with the settle wake it owes the caller recorded and handed back.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { agentSession, herdrRun, parseReply } from './herdr.mjs';
import { modelTail } from './schema.mjs';
import { collapse } from './ledger.mjs';
import { deliver } from './deliver.mjs';
import { extractComposer, readRecent, recoverStartupScreen, screenSpecimen } from './screens.mjs';
import { prescribeWake } from './wake.mjs';
import { numericEnv, sleep } from './timing.mjs';

// The read-back window has to cover a real CLI's first turn, which starts only
// after it has connected its MCP servers (observed live: several seconds for
// both omp and claude, 2026-08-01). It bounds the wait; a landing exits early.
const DEFAULT_VERIFY_ATTEMPTS = 120;
const DEFAULT_VERIFY_INTERVAL_MS = 250;
// `agent start` returns on interactive_ready, which a CLI can reach well before
// it publishes its session file (observed live: omp, and claude taking past 5s
// from a cold start, 2026-08-01), so the session is polled rather than read
// once, over a window sized for a cold start rather than a warm one.
const DEFAULT_SESSION_ATTEMPTS = 60;
const DEFAULT_SESSION_INTERVAL_MS = 250;
// A freshly created tab reaches its interactive prompt a beat after herdr
// reports the tab, and `agent start` refuses a pane that is not an available
// shell yet (observed live: agent_pane_busy, 2026-08-01).
const DEFAULT_PANE_ATTEMPTS = 40;
const DEFAULT_PANE_INTERVAL_MS = 250;
const SETTLED_WITH_OUTPUT = new Set(['idle', 'done', 'settled']);

function transcript(run) {
  return { argv: run.argv, status: run.status, stdout: run.stdout, stderr: run.stderr };
}

/**
 * Launch flags for an agent's `style_file`, if it carries one. c2d passes the
 * file PATH straight to the CLI's own file-reading flag; it never reads or
 * transforms the file itself, so a multi-line persona body never has to be
 * shell-encoded as a CLI argument. On claude it also neutralizes the ambient
 * output style (`Default`, docs-confirmed) so the persona is the only voice
 * over the default base. omp carries no ambient output style, so it takes the
 * file form alone.
 */
export function styleArgs(agent) {
  if (!agent?.style_file) return [];
  if (agent.cli === 'claude') {
    return ['--settings', '{"outputStyle":"Default"}', '--append-system-prompt-file', agent.style_file];
  }
  return ['--append-system-prompt', agent.style_file];
}

/** A herdr call that must answer JSON; the transcript comes back on any failure. */
function call(args, options) {
  const run = herdrRun(args, options);
  if (run.status !== 0) return { ok: false, run, reason: `herdr exited ${run.status ?? 'without running'}` };
  const reply = parseReply(run.stdout);
  if (reply === null) return { ok: false, run, reason: 'herdr reply was not JSON' };
  if (reply.error) return { ok: false, run, reason: `herdr error: ${reply.error.code ?? ''} ${reply.error.message ?? ''}`.trim() };
  return { ok: true, run, reply };
}

/** Tokens a live agent has actually spent, as a boolean "none yet". */
export function tokensAreZero(tokens) {
  if (tokens === null || tokens === undefined) return true;
  const values = typeof tokens === 'object' ? Object.values(tokens) : [tokens];
  if (values.length === 0) return true;
  return values.every((value) => {
    const text = String(value).trim().toLowerCase();
    if (text === '' || text === '0' || text === '—' || text === '-') return true;
    const number = Number.parseFloat(text.replace(/[,_]/g, ''));
    return !Number.isFinite(number) || number === 0;
  });
}

/** Heuristic only: does recent output mention the brief's subject at all. */
export function subjectMatch(output, agent) {
  const hay = collapse(output);
  if (hay === '') return 'unknown';
  const needles = [];
  if (agent.brief?.spec_path) needles.push(agent.brief.spec_path);
  const words = collapse(agent.brief?.text ?? '')
    .split(' ')
    .filter((word) => word.length >= 8);
  needles.push(...words.slice(0, 5));
  if (needles.length === 0) return 'unknown';
  return needles.some((needle) => hay.includes(needle));
}

/** Resolve the workspace label to the id `tab create` wants. */
export function resolveWorkspace(workspace, options = {}) {
  if (!workspace?.label) return { ok: true, workspace_id: null };
  const list = call(['workspace', 'list'], options);
  if (!list.ok) return { ok: false, reason: `workspace list: ${list.reason}`, herdr: transcript(list.run) };
  const workspaces = list.reply.result?.workspaces ?? [];
  const found = workspaces.find((entry) => entry.label === workspace.label);
  if (found) return { ok: true, workspace_id: found.workspace_id };
  if (!workspace.create_cwd) {
    return { ok: false, reason: `workspace "${workspace.label}" is not live and no create_cwd was given` };
  }
  const created = call(
    ['workspace', 'create', '--cwd', workspace.create_cwd, '--label', workspace.label, '--no-focus'],
    options,
  );
  if (!created.ok) return { ok: false, reason: `workspace create: ${created.reason}`, herdr: transcript(created.run) };
  const id = created.reply.result?.workspace?.workspace_id ?? created.reply.result?.workspace_id ?? null;
  if (id === null) return { ok: false, reason: 'workspace create returned no workspace_id', herdr: transcript(created.run) };
  return { ok: true, workspace_id: id };
}

function agentGet(name, options) {
  return call(['agent', 'get', name], options);
}

/** herdr's refusal to start an agent in a pane that is still coming up. */
function isPaneBusy(run) {
  return parseReply(run?.stderr ?? '')?.error?.code === 'agent_pane_busy';
}

/**
 * `agent start`, retried for as long as herdr says the pane is not an available
 * shell yet. Every other failure comes straight back on the first try.
 * @returns the `call` result of the last attempt
 */
export function startWhenPaneIsShell(startArgs, { env = process.env, options = {} } = {}) {
  const attempts = numericEnv(env, 'CATALYST_DISPATCH_PANE_ATTEMPTS', DEFAULT_PANE_ATTEMPTS);
  const interval = numericEnv(env, 'CATALYST_DISPATCH_PANE_INTERVAL_MS', DEFAULT_PANE_INTERVAL_MS);
  let started = call(startArgs, options);
  for (let attempt = 1; attempt < Math.max(1, attempts); attempt += 1) {
    if (started.ok || !isPaneBusy(started.run)) return started;
    sleep(interval);
    started = call(startArgs, options);
  }
  return started;
}

/**
 * Poll `agent get` until the CLI has published its session, so a launch is not
 * failed for a session that is merely late.
 * @returns {{ok: boolean, info: object, live: object}}
 */
export function waitForSession(name, { env = process.env, options = {} } = {}) {
  const attempts = numericEnv(env, 'CATALYST_DISPATCH_SESSION_ATTEMPTS', DEFAULT_SESSION_ATTEMPTS);
  const interval = numericEnv(env, 'CATALYST_DISPATCH_SESSION_INTERVAL_MS', DEFAULT_SESSION_INTERVAL_MS);
  let info = agentGet(name, options);
  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    if (!info.ok) return { ok: false, info, live: {} };
    const live = info.reply.result?.agent ?? {};
    if (live.agent_session) return { ok: true, info, live };
    if (attempt + 1 >= Math.max(1, attempts)) return { ok: false, info, live };
    sleep(interval);
    info = agentGet(name, options);
  }
  return { ok: false, info, live: {} };
}

/**
 * Step 5: the brief landed if the agent is acting on it. Read-back, never send
 * receipt.
 *
 * Live herdr publishes no `tokens` field for every CLI (omp, 2026-08-01), so an
 * agent that settles before any working sample is judged on evidence the tool
 * can actually see (orchestrator ruling, plan index "Wave-3 review outcome"):
 * one observed working sample, or output that names the brief's subject, both
 * verify; nothing on screen and nothing in the composer fails; anything between
 * reports `verified: "unknown"` and leaves the judgment to the caller.
 *
 * @returns {{verified: true|false|'unknown', status, attempts, subject_match,
 *            method: 'composer'|'indirect', reason?, herdr?}}
 */
export function verifyBriefLanding({ agent, env = process.env, options = {} }) {
  const attempts = numericEnv(env, 'CATALYST_DISPATCH_VERIFY_ATTEMPTS', DEFAULT_VERIFY_ATTEMPTS);
  const interval = numericEnv(env, 'CATALYST_DISPATCH_VERIFY_INTERVAL_MS', DEFAULT_VERIFY_INTERVAL_MS);
  let status = null;
  let output = '';
  let sawWorking = false;
  let composerLocated = false;
  let lastComposer = null;
  let lastZeroTokens = true;
  let taken = 0;

  // How the landing was read: `composer` when the CLI's composer could be
  // located at least once, `indirect` when the check had to fall back to "not
  // visibly parked" plus the subject grep (omp and any other CLI whose composer
  // the claude-shaped extractor cannot find).
  const method = () => (composerLocated ? 'composer' : 'indirect');
  const done = (verified, extra = {}) => ({
    verified,
    status,
    attempts: taken,
    subject_match: subjectMatch(output, agent),
    method: method(),
    ...extra,
  });

  for (let attempt = 0; attempt < Math.max(1, attempts); attempt += 1) {
    taken = attempt + 1;
    const info = agentGet(agent.name, options);
    if (!info.ok) {
      return done(false, { reason: `agent get: ${info.reason}`, herdr: transcript(info.run) });
    }
    const live = info.reply.result?.agent ?? {};
    status = live.agent_status ?? null;
    try {
      output = readRecent(agent.name, options);
    } catch (error) {
      return done(false, { reason: `agent read: ${error.message}`, herdr: error.toJSON?.() ?? null });
    }
    const composer = extractComposer(output);
    // Three readings, not two: a composer holding text is the block, a located
    // empty one is the unbriefed signature, and one the extractor cannot locate
    // at all is neither. The extractor knows the claude composer; a CLI that
    // draws another shape (omp, live 2026-08-01) yields null, and reading null
    // as "parked" makes the landing unverifiable for every such CLI.
    const composerParked = composer !== null && collapse(composer) !== '';
    const outputNonEmpty = collapse(output) !== '';
    const zeroTokens = tokensAreZero(live.tokens);
    if (composer !== null) composerLocated = true;
    lastComposer = composer;
    lastZeroTokens = zeroTokens;

    if (status === 'working') sawWorking = true;
    if (status === 'working' && !composerParked && outputNonEmpty) return done(true);
    if (SETTLED_WITH_OUTPUT.has(status) && !zeroTokens && !composerParked && outputNonEmpty) return done(true);
    sleep(interval);
  }

  // The window closed without a live working sample. Everything below is a
  // verdict on the evidence collected, not on a single reading: a CLI that has
  // not started its first turn shows the unbriefed signature too, so no verdict
  // is taken before the window is spent.
  const composerParked = lastComposer !== null && collapse(lastComposer) !== '';
  const composerEmpty = lastComposer !== null && collapse(lastComposer) === '';
  const outputNonEmpty = collapse(output) !== '';
  const subject = subjectMatch(output, agent);

  if (sawWorking) return done(true);
  if (outputNonEmpty && subject === true) return done(true);
  if (composerParked) {
    return done(false, { reason: `the brief is still parked in the composer: ${collapse(lastComposer).slice(0, 400)}` });
  }
  if (status === 'idle' && lastZeroTokens && composerEmpty) {
    return done(false, { reason: 'idle at zero tokens with an empty composer: the unbriefed-agent signature' });
  }
  if (!outputNonEmpty) {
    return done(false, { reason: 'the agent showed no output and holds nothing in its composer: nothing says the brief landed' });
  }
  return done('unknown', {
    reason: 'the agent settled without a working sample and its output does not name the brief; verification is inconclusive',
  });
}

/**
 * Bring one agent up, fully, and report exactly what happened.
 * @returns per-agent result object per 01's result document, plus `ok` and, on
 *          failure, `failure: {agent, step, detail, herdr_output}`.
 */
export function launchAgent(agent, ctx) {
  const result = {
    name: agent.name,
    tab_id: null,
    pane_id: null,
    cwd: agent.cwd,
    session: null,
    model: agent.model,
    effort: agent.effort ?? null,
    thinking: agent.thinking ?? null,
    brief_text_delivered: null,
    mandate_mode: ctx.mandate_mode ?? 'injected',
    brief_delivery: { verified: false, attempts: 0, subject_match: 'unknown', method: null },
    wake: { owed_by: 'caller', armed_by_tool: false, command: null, timeout_ms: ctx.heartbeat_ms },
    status_at_return: null,
    ok: false,
  };

  const fail = (step, detail, herdrOutput = null) => {
    result.ok = false;
    result.failure = { agent: agent.name, step, detail, herdr_output: herdrOutput };
    return result;
  };

  // The agent may already be live by the time anything here throws, so an
  // unexpected error becomes a failure record on this agent's own result rather
  // than an exception that takes the whole dispatch document with it.
  try {
    return runLaunchSteps(agent, ctx, result, fail);
  } catch (error) {
    return fail('unexpected_error', `${error.name ?? 'Error'}: ${error.message}`, error.toJSON?.() ?? null);
  }
}

/** The six launch steps themselves. Every exit goes through `fail` or `result`. */
function runLaunchSteps(agent, ctx, result, fail) {
  const {
    dispatch_id: dispatchId = null,
    workspace_id: workspaceId = null,
    heartbeat_ms: heartbeatMs,
    mandate_mode: mandateMode = 'injected',
  } = ctx;
  const env = ctx.env ?? process.env;
  const options = ctx.options ?? {};
  const screenAnswers = ctx.screen_answers ?? {};

  // 1. Tab create, one literal command, cwd read-back checked.
  const tabArgs = ['tab', 'create'];
  if (workspaceId) tabArgs.push('--workspace', workspaceId);
  tabArgs.push('--cwd', agent.cwd, '--label', agent.name, agent.focus ? '--focus' : '--no-focus');
  const tab = call(tabArgs, options);
  if (!tab.ok) return fail('tab_create', tab.reason, transcript(tab.run));
  result.tab_id = tab.reply.result?.tab?.tab_id ?? null;
  result.pane_id = tab.reply.result?.root_pane?.pane_id ?? null;
  const paneCwd = tab.reply.result?.root_pane?.cwd ?? null;
  if (result.pane_id === null) return fail('tab_create', 'tab create returned no root pane id', transcript(tab.run));
  if (paneCwd !== agent.cwd) {
    return fail(
      'tab_create_cwd_readback',
      `root_pane.cwd is "${paneCwd}", not the requested "${agent.cwd}" (herdr falls back to $HOME on a bad path)`,
      transcript(tab.run),
    );
  }

  // 2. Start the CLI in that tab's root pane. Model and level only, never a
  //    permission flag: launch mode is the user's setting.
  const startArgs = ['agent', 'start', agent.name, '--kind', agent.cli, '--pane', result.pane_id, '--', ...modelTail(agent), ...styleArgs(agent)];
  const started = startWhenPaneIsShell(startArgs, { env, options });
  if (!started.ok) return fail('agent_start', started.reason, transcript(started.run));
  result.session = started.reply.result?.agent?.agent_session ?? null;

  // 3. Confirm the agent, and clear whatever screen a fresh CLI is sitting on.
  let info = agentGet(agent.name, options);
  if (!info.ok) return fail('agent_get', info.reason, transcript(info.run));
  let live = info.reply.result?.agent ?? {};
  if ((live.cwd ?? null) !== agent.cwd) {
    return fail('agent_get_cwd', `agent get reports cwd "${live.cwd ?? null}", not the requested "${agent.cwd}"`, transcript(info.run));
  }
  if (!live.agent_status) return fail('agent_get', 'agent get reported no status', transcript(info.run));

  // The screen check waits on the same readiness the session wait below does,
  // so a CLI that is merely slow to draw is never mistaken for a gated one.
  // Readiness differs per CLI: omp and every other CLI herdr publishes a
  // session for is ready when the session appears; a claude agent on herdr
  // 0.8.0 never publishes one (incident 2026-08-18-c2d-claude-session-identity),
  // and claude's own `interactive_ready` fires before any gate it draws — the
  // workspace trust prompt — so it is not readiness: exiting the poll on it
  // leaves the gate unanswered and delivery finds no composer (observed live
  // 2026-08-18 on the probe launch). Claude readiness is the composer itself,
  // the poll's own positive exit.
  const sessionPublished = () => {
    const poll = agentGet(agent.name, options);
    return poll.ok && Boolean(poll.reply.result?.agent?.agent_session);
  };
  const isReady = agent.cli === 'claude' ? null : sessionPublished;

  if (!live.agent_session) {
    let screen;
    try {
      screen = recoverStartupScreen({
        name: agent.name,
        cwd: agent.cwd,
        screenAnswers,
        options,
        env,
        isReady,
      });
    } catch (error) {
      return fail('interactive_screen', `agent read failed: ${error.message}`, error.toJSON?.() ?? null);
    }
    if (!screen.ok) {
      return fail('interactive_screen', `${screen.reason}. Screen: ${screenSpecimen(screen.screen)}`);
    }
    if (agent.cli !== 'claude') {
      // omp and every other CLI herdr publishes a session for: wait for it,
      // so a launch is not failed for a session that is merely late.
      const waited = waitForSession(agent.name, { env, options });
      info = waited.info;
      if (!info.ok) return fail('agent_get', info.reason, transcript(info.run));
      live = waited.live;
      if (!waited.ok) {
        return fail(
          'session_not_established',
          `no interactive screen was left to clear (startup screen: ${screen.action}) and the agent published no session within the session wait window`,
          transcript(info.run),
        );
      }
    } else {
      // claude: herdr publishes no session to wait for; the screen poll above
      // already waited for the composer (answering any gate it drew). Re-read
      // and build the session identity from the fields herdr does publish
      // (name, terminal_id, pane_id).
      info = agentGet(agent.name, options);
      if (!info.ok) return fail('agent_get', info.reason, transcript(info.run));
      live = info.reply.result?.agent ?? {};
    }
    result.session = agentSession(live);
    if (result.session === null) {
      return fail(
        'session_not_established',
        'the agent is up but herdr published no session and no identity fields (name, terminal_id, pane_id) to derive one from',
        transcript(info.run),
      );
    }
  } else {
    result.session = live.agent_session;
  }
  result.status_at_return = live.agent_status ?? null;

  // 4. Deliver the brief.
  const sessionValue = result.session?.value ?? null;
  const delivery = deliver({
    name: agent.name,
    cli: agent.cli,
    session: sessionValue,
    text: agent.brief.text,
    verb: 'dispatch',
    mandateMode,
    env,
    options,
  });
  result.brief_delivery.attempts = delivery.attempts ?? 0;
  if (delivery.status === 'refused' || delivery.status === 'failed') {
    result.brief_text_delivered = null;
    return fail(
      'brief_delivery',
      `${delivery.status}: ${delivery.reason}${delivery.specimen ? ` Specimen: ${delivery.specimen}` : ''}`,
      delivery.herdr ?? null,
    );
  }
  result.brief_text_delivered = delivery.text;

  // 5. Brief-landing verification, this agent's own, immediately after its own
  //    prompt: a batched check cannot tell whose brief landed.
  const landing = verifyBriefLanding({ agent, env, options });
  result.status_at_return = landing.status ?? result.status_at_return;
  result.brief_delivery.subject_match = landing.subject_match;
  result.brief_delivery.method = landing.method;
  if (landing.verified === false) {
    return fail('brief_landing', landing.reason, landing.herdr ?? null);
  }
  // true or "unknown": an inconclusive read leaves the agent launched and says
  // so in the document rather than failing an agent that may well be working.
  result.brief_delivery.verified = landing.verified;
  if (landing.verified === 'unknown') result.brief_delivery.verified_reason = landing.reason;

  // 6. Record the settle wake the caller owes. The tool prescribes it and never
  // runs it: a wait spawned from here is orphaned and wakes nobody (wake.mjs).
  result.wake = prescribeWake({
    name: agent.name,
    timeoutMs: heartbeatMs,
    status: result.status_at_return,
    dispatchId,
    env,
    options,
  });

  result.ok = true;
  return result;
}

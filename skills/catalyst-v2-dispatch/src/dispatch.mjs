// Multi-agent composition over the launch primitive: one agent fully up before
// the next starts, every agent the tool touched reported whatever the outcome.
// The tool never kills work — on abort, the agents already live stay live and
// teardown is the caller's.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { fetchRoster, rosterAgents } from './herdr.mjs';
import { launchAgent, resolveWorkspace } from './launch.mjs';
import { priorFailures, recordAgentFailure, targetsFor } from './failures.mjs';
import { assembleResult, persistResult } from './result.mjs';

function liveRoster(options) {
  try {
    return rosterAgents(fetchRoster(options));
  } catch {
    return [];
  }
}

/**
 * The dispatching session as the roster names it, matched on the herdr pane
 * (or tab) ids herdr sets in its environment. Launched agents address their
 * hand-back to it as `--agent dispatcher` (incident
 * 2026-10-28-orchestrator-name-taken-handback-misroute). Null outside herdr.
 */
export function callerIdentity(env, roster) {
  const paneId = env.HERDR_PANE_ID ?? null;
  const tabId = env.HERDR_TAB_ID ?? null;
  if (paneId === null && tabId === null) return null;
  const self = roster.find((agent) => paneId !== null && agent?.pane_id === paneId)
    ?? roster.find((agent) => tabId !== null && agent?.tab_id === tabId);
  return {
    name: self?.name ?? null,
    pane_id: paneId,
    tab_id: tabId,
    cwd: self?.cwd ?? null,
  };
}

/**
 * Run a validated dispatch input.
 * @returns {{document: object, persisted: string|null}}
 */
export function runDispatch(input, { env = process.env, options = {} } = {}) {
  const history = priorFailures(input.agents.flatMap(targetsFor), env);

  const workspace = resolveWorkspace(input.workspace, options);
  if (!workspace.ok) {
    const document = assembleResult({
      input,
      results: [],
      rosterNames: [],
      priorFailures: history,
      notLaunched: input.agents.map((agent) => agent.name),
      extraFailures: [{ agent: null, step: 'workspace', detail: workspace.reason, herdr_output: workspace.herdr ?? null }],
    });
    return { document, persisted: persistResult(document, env) };
  }

  const ctx = {
    dispatch_id: input.dispatch_id,
    workspace_id: workspace.workspace_id,
    heartbeat_ms: input.heartbeat_ms,
    mandate_mode: input.mandate_mode ?? 'injected',
    screen_answers: input.screen_answers ?? {},
    env,
    options,
  };

  const results = [];
  const notLaunched = [];
  const extraFailures = [];
  let aborted = false;

  try {
    for (const agent of input.agents) {
      if (aborted) {
        notLaunched.push(agent.name);
        continue;
      }
      const result = launchAgent(agent, ctx);
      results.push(result);
      if (!result.ok) {
        recordAgentFailure({ agent, failure: result.failure, dispatchId: input.dispatch_id, env });
        if (input.on_failure !== 'continue') aborted = true;
      }
    }
  } catch (error) {
    // Nothing below launchAgent is expected to throw, but agents are already
    // live by now: the document with their handles matters more than the stack.
    extraFailures.push({ agent: null, step: 'dispatch', detail: `${error.name ?? 'Error'}: ${error.message}`, herdr_output: error.toJSON?.() ?? null });
    for (const agent of input.agents) {
      if (!results.some((entry) => entry.name === agent.name) && !notLaunched.includes(agent.name)) {
        notLaunched.push(agent.name);
      }
    }
  }

  const roster = liveRoster(options);
  const document = assembleResult({
    input,
    caller: callerIdentity(env, roster),
    results,
    rosterNames: roster.map((agent) => agent?.name).filter(Boolean),
    priorFailures: history,
    notLaunched,
    extraFailures,
  });
  return { document, persisted: persistResult(document, env) };
}

// Multi-agent composition over the launch primitive: one agent fully up before
// the next starts, every agent the tool touched reported whatever the outcome.
// The tool never kills work — on abort, the agents already live stay live and
// teardown is the caller's.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { fetchRoster, rosterAgents } from './herdr.mjs';
import { launchAgent, resolveWorkspace } from './launch.mjs';
import { priorFailures, recordAgentFailure, targetsFor } from './failures.mjs';
import { assembleResult, persistResult } from './result.mjs';

function liveNames(options) {
  try {
    return rosterAgents(fetchRoster(options)).map((agent) => agent?.name).filter(Boolean);
  } catch {
    return [];
  }
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

  const document = assembleResult({
    input,
    results,
    rosterNames: liveNames(options),
    priorFailures: history,
    notLaunched,
    extraFailures,
  });
  return { document, persisted: persistResult(document, env) };
}

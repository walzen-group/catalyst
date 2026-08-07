// Build the `c2d dispatch` input document for an actor or judge launch and, by
// default, invoke the real c2d CLI. A test run has no meta, so every agent
// carries kind: "unit" (exempt from the tool's worker-needs-meta refusal). The
// injectable invoker is a unit-test seam only: a real run always launches
// through the real CLI. Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { spawnSync } from 'node:child_process';

export const DEFAULT_HEARTBEAT_MS = 900000;
// How long the real invoker blocks on `herdr agent wait` for one agent to
// settle. The runner is a one-shot script with nothing else to do while a
// single agent works, so a blocking wait per agent is fine.
export const DEFAULT_AGENT_WAIT_MS = 900000;
// Recent terminal lines pulled back per agent, and the char ceiling on the
// captured final report handed to the judge. The judge's JSON verdict and an
// actor's answer both sit at the tail of the transcript, so a recent-lines
// window with a bounded tail is enough.
export const DEFAULT_READ_LINES = 400;
export const REPORT_TAIL_LIMIT = 6000;

function numericOption(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function boundedTail(text, limit) {
  const s = String(text ?? '');
  return s.length > limit ? s.slice(s.length - limit) : s;
}

/** models.yaml runtime -> the c2d `cli` value. */
export function runtimeToCli(runtime) {
  if (runtime === 'claude-code') return 'claude';
  if (runtime === 'omp') return 'omp';
  return runtime;
}

/**
 * The cli plus capability flag for a role, in the spelling its cli kind uses.
 * A claude effort of "default" is omitted so the CLI applies its own default.
 */
export function capabilityFor(roleEntry) {
  const cli = runtimeToCli(roleEntry.runtime);
  const cap = { cli };
  if (cli === 'omp') {
    if (roleEntry.thinking) cap.thinking = roleEntry.thinking;
  } else if (cli === 'claude') {
    if (roleEntry.effort && roleEntry.effort !== 'default') cap.effort = roleEntry.effort;
  } else if (roleEntry.thinking) {
    cap.thinking = roleEntry.thinking;
  } else if (roleEntry.effort && roleEntry.effort !== 'default') {
    cap.effort = roleEntry.effort;
  }
  return cap;
}

/**
 * A single-agent `c2d dispatch` input document. The agent starts in the test's
 * own directory; the brief is delivered inline (no spec pointer).
 */
export function buildDispatchInput({
  dispatchId,
  name,
  cwd,
  model,
  roleEntry,
  briefText,
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
  mandateMode,
}) {
  const cap = capabilityFor(roleEntry);
  const agent = {
    name,
    cwd,
    cli: cap.cli,
    model,
    kind: 'unit',
    brief: { mode: 'inline', text: briefText },
  };
  if (cap.effort !== undefined) agent.effort = cap.effort;
  if (cap.thinking !== undefined) agent.thinking = cap.thinking;
  const document = {
    dispatch_id: dispatchId,
    heartbeat_ms: heartbeatMs,
    on_failure: 'abort',
    agents: [agent],
  };
  // Omitted mandate_mode keeps the c2d default (injected); caller_owned is
  // sent explicitly so the fixture owns the complete prompt.
  if (mandateMode !== undefined) document.mandate_mode = mandateMode;
  return document;
}

/** The launched agent's tab id, read from the c2d dispatch result document. */
function launchedTabId(dispatchStdout, name) {
  try {
    const doc = JSON.parse(dispatchStdout);
    const agents = Array.isArray(doc?.agents) ? doc.agents : [];
    const found = agents.find((a) => a && a.name === name) ?? agents[0];
    return found?.tab_id ?? null;
  } catch {
    return null;
  }
}

/**
 * The brief text c2d records as delivered for the named agent, read from the
 * dispatch result document. Null when the document is absent or carries no
 * agent entry. Deterministic checks compare this record against the scenario
 * fixture to prove the delivery was caller-owned.
 */
export function deliveredBriefText(dispatchStdout, name) {
  try {
    const doc = JSON.parse(dispatchStdout);
    const agents = Array.isArray(doc?.agents) ? doc.agents : [];
    const found = agents.find((a) => a && a.name === name) ?? agents[0];
    return found?.brief_text_delivered ?? null;
  } catch {
    return null;
  }
}

/**
 * Wait for a launched agent to settle, then capture its produced output.
 * `c2d dispatch` is fire-and-forget: it launches the agent and returns a
 * launch-plan document while the agent is still working. So capturing an agent's
 * real answer is a second step: block on `herdr agent wait` until it settles,
 * then read its terminal through `herdr agent read`. Raw session files
 * (~/.omp/agent/sessions/*.jsonl, claude equivalents) are never read, per
 * catalyst-v2-multiplexer-agent-ops: the herdr read surface is the only one.
 *
 * Returns { captured, settled, gone }: `settled` is the wait matching a
 * terminal state within the window (the wait matches idle/done/blocked);
 * `gone` is the agent no longer existing on the roster, wait and read both
 * failing with agent_not_found. A timed-out wait with the agent still live is
 * neither: the agent is in flight, and closing its tab is forbidden by the
 * teardown gate.
 */
function captureAgentOutput(herdrBin, name, { waitTimeoutMs, readLines }) {
  const wait = spawnSync(herdrBin, ['agent', 'wait', name, '--timeout', String(waitTimeoutMs)], {
    encoding: 'utf8',
  });
  // recent-unwrapped, not recent: the wrapped source injects a literal newline
  // plus indent wherever a logical line overran the terminal width, which lands
  // inside JSON string values and breaks the judge parse. Unwrapped hands back
  // the logical lines the agent emitted.
  const read = spawnSync(
    herdrBin,
    ['agent', 'read', name, '--source', 'recent-unwrapped', '--lines', String(readLines), '--format', 'text'],
    { encoding: 'utf8' },
  );
  const captured = String(read.stdout ?? '').trim();
  const settled = wait.status === 0;
  const gone = !settled && read.status !== 0 && /not.?found/i.test(String(read.stderr ?? ''));
  return { captured, settled, gone };
}

/**
 * The agent's current status out of `herdr agent get`, or null when it cannot
 * be read. A settle on the wait is not completion: the wait matches idle, done,
 * and blocked, and a blocked agent is live on a dialog.
 */
function agentStatus(herdrBin, name) {
  const get = spawnSync(herdrBin, ['agent', 'get', name], { encoding: 'utf8' });
  try {
    const body = JSON.parse(String(get.stdout ?? ''));
    return body?.result?.agent?.agent_status ?? null;
  } catch {
    return null;
  }
}

/** Close the agent's tab so the deterministic ${slug}-actor/-judge names are free on a re-run. */
function closeAgentTab(herdrBin, tabId) {
  if (!tabId) return;
  spawnSync(herdrBin, ['tab', 'close', String(tabId)], { encoding: 'utf8' });
}

/**
 * The default invoker: launch through the real c2d CLI, then settle and capture.
 * `c2d dispatch` only launches (it returns a launch-plan document, not the
 * agent's answer), so the real invoker does the rest itself: wait for the agent
 * to settle, read its produced output off the herdr surface, close its tab, and
 * return the captured transcript. `report` is a size-bounded tail of that
 * transcript (the agent's final report and judge JSON live at the tail);
 * `transcript` is the fuller recent capture. The unit suite substitutes a fake
 * invoker that returns a canned report and burns no live agent.
 *
 * The tab closes only when the agent settled or is gone (the teardown gate,
 * catalyst-v2-multiplexer-agent-ops). A timed-out wait with the agent still
 * live is an in-flight agent: the tab stays open, the run errors, and the
 * caller owns the live tab (incident
 * 2026-08-04-runner-closes-in-flight-agent). A wait that settles on blocked is
 * the same shape: the agent is live on a dialog, so the tab stays open and the
 * run errors (incident 2026-08-04-steer-failure-killed-claude).
 */
export function makeRealInvoker({
  bin = process.env.CATALYST_C2D_BIN || 'c2d',
  herdrBin = process.env.CATALYST_HERDR_BIN || 'herdr',
  waitTimeoutMs = numericOption(process.env.CATALYST_AGENT_WAIT_MS, DEFAULT_AGENT_WAIT_MS),
  readLines = numericOption(process.env.CATALYST_AGENT_READ_LINES, DEFAULT_READ_LINES),
  reportTailLimit = REPORT_TAIL_LIMIT,
} = {}) {
  return (inputDocument) => {
    const name = inputDocument?.agents?.[0]?.name;
    const res = spawnSync(bin, ['dispatch'], {
      input: JSON.stringify(inputDocument),
      encoding: 'utf8',
    });
    if (res.error) return { code: 1, report: '', transcript: '', stdout: '', stderr: String(res.error.message) };
    const code = res.status ?? 1;
    const stdout = res.stdout ?? '';
    const stderr = res.stderr ?? '';
    // A failed launch (or a document with no agent name to wait on) is left for
    // the runner to record as an errored run; there is nothing to capture.
    if (code !== 0) return { code, report: '', transcript: '', stdout, stderr };
    if (!name) {
      return { code: 1, report: '', transcript: '', stdout, stderr: `${stderr}\ndispatch input carried no agent name to wait on`.trim() };
    }

    const tabId = launchedTabId(stdout, name);
    const { captured, settled, gone } = captureAgentOutput(herdrBin, name, { waitTimeoutMs, readLines });
    if (!settled && !gone) {
      return {
        code: 1,
        report: '',
        transcript: captured,
        stdout,
        stderr: `agent ${name} did not settle within ${waitTimeoutMs}ms and is still live; tab left open`,
      };
    }
    // The wait matches idle, done, and blocked. A blocked agent is parked on
    // an approval or question UI: live, not finished, and closing its tab
    // terminates a live session on an ambiguous settle (incident
    // 2026-08-04-steer-failure-killed-claude). The run errors and the caller
    // owns the live tab, exactly like the in-flight case above.
    if (settled && agentStatus(herdrBin, name) === 'blocked') {
      return {
        code: 1,
        report: '',
        transcript: captured,
        stdout,
        stderr: `agent ${name} settled on blocked; the agent is live on a dialog and its tab is left open`,
      };
    }
    closeAgentTab(herdrBin, tabId);
    if (gone) {
      return { code: 1, report: '', transcript: captured, stdout, stderr: `agent ${name} is gone; nothing to capture` };
    }
    return {
      code: 0,
      report: boundedTail(captured, reportTailLimit),
      transcript: captured,
      stdout,
      stderr,
    };
  };
}

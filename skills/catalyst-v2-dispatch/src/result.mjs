// Result-document assembly and persistence. One place builds the document so
// the single-agent and multi-agent paths cannot drift, and `status` can read a
// dispatch back by id.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateSubdir } from './ledger.mjs';

/**
 * The wake as the document reports it: the command the CALLER owes, never a
 * claim that anything was armed. There is no `armed` and no `pid` here, because
 * the tool starts no wait — one it started would be orphaned to init and its
 * exit would wake nobody (`wake.mjs`,
 * `.cortex/incidents/2026-08-01-dispatch-wake-armed-nothing-delivers.md`).
 */
export function presentWake(wake) {
  return {
    owed_by: 'caller',
    armed_by_tool: false,
    command: wake?.command ?? null,
    timeout_ms: wake?.timeout_ms ?? null,
    settled_at_return: wake?.settled_at_return ?? false,
    already_running: wake?.already_running ?? false,
    existing_wait_pid: wake?.existing_wait_pid ?? null,
    instruction: wake?.instruction ?? null,
  };
}

/**
 * A wake counts as satisfied once the tool has handed back a runnable command.
 * The tool cannot see whether the caller ran it; `status` reads that off the
 * live process table.
 */
export function wakeSatisfied(wake) {
  return typeof wake?.command === 'string' && wake.command.length > 0;
}

/** The 01 result-document fields of one launched agent. */
export function presentAgent(agent) {
  return {
    name: agent.name,
    tab_id: agent.tab_id,
    pane_id: agent.pane_id,
    cwd: agent.cwd,
    session: agent.session,
    model: agent.model,
    effort: agent.effort ?? null,
    thinking: agent.thinking ?? null,
    brief_text_delivered: agent.brief_text_delivered,
    mandate_mode: agent.mandate_mode ?? 'injected',
    brief_delivery: agent.brief_delivery,
    wake: presentWake(agent.wake),
    status_at_return: agent.status_at_return,
  };
}

/** ok when every agent in the call is up, failed when none is, partial between. */
export function overallStatus(expected, results) {
  const up = results.filter((agent) => agent.ok).length;
  if (up === 0) return 'failed';
  return up === expected ? 'ok' : 'partial';
}

/**
 * The auditable count, read from the roster rather than from intent.
 * @param rosterNames names `herdr agent list` reports live
 */
export function reconcileRoster(expected, results, rosterNames) {
  const live = new Set(rosterNames);
  const liveOnBrief = results.filter((agent) => agent.ok && live.has(agent.name)).length;
  // Counts the wakes handed back, which is all the tool controls. Whether the
  // caller then ran them is a separate reading, and `status` is where it lives.
  const wakesPrescribed = results.filter((agent) => wakeSatisfied(agent.wake)).length;
  return {
    expected,
    live_on_brief: liveOnBrief,
    wakes_prescribed: wakesPrescribed,
    wakes_run_by_caller: 'unknown to this tool; read `status` after you arm them',
    agree: liveOnBrief === expected && wakesPrescribed === expected,
  };
}

/**
 * Assemble the whole document.
 * @param {{input, results, rosterNames, priorFailures, notLaunched, extraFailures}} parts
 */
export function assembleResult({
  input,
  results = [],
  rosterNames = [],
  priorFailures = [],
  notLaunched = [],
  extraFailures = [],
}) {
  const expected = input.agents.length;
  const failures = [
    ...extraFailures,
    ...results.filter((agent) => agent.failure).map((agent) => agent.failure),
  ];
  return {
    dispatch_id: input.dispatch_id,
    status: extraFailures.length > 0 && results.length === 0 ? 'failed' : overallStatus(expected, results),
    agents: results.map(presentAgent),
    roster_reconciliation: reconcileRoster(expected, results, rosterNames),
    not_launched: notLaunched,
    prior_failures: priorFailures,
    failures,
  };
}

export function resultPath(dispatchId, env = process.env) {
  return join(stateSubdir('results', env), `${encodeURIComponent(dispatchId)}.json`);
}

/** Persist the document `status --dispatch-id` reads back. */
export function persistResult(document, env = process.env) {
  const path = resultPath(document.dispatch_id, env);
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
  return path;
}

export function loadResult(dispatchId, env = process.env) {
  const path = resultPath(dispatchId, env);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

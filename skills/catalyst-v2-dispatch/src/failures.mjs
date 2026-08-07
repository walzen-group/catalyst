// Per-target failure ledger. What went wrong repeatedly should be visible at the
// moment of re-dispatch rather than reconstructed from session memory, so every
// per-agent failure is filed under its target and read back into the result.
// Indication for the caller's retry-then-intervene judgment, never enforcement.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateSubdir } from './ledger.mjs';

const MAX_ENTRIES = 20;

function ledgerPath(target, env) {
  return join(stateSubdir('failures', env), `${encodeURIComponent(target)}.json`);
}

/** The targets one agent is filed under: its name, and its spec path if it has one. */
export function targetsFor(agent) {
  const targets = [agent.name];
  const specPath = agent.brief?.spec_path;
  if (specPath) targets.push(specPath);
  return targets;
}

export function readLedger(target, env = process.env) {
  const path = ledgerPath(target, env);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** File one failure against one target. */
export function recordFailure({ target, step, detail, dispatchId = null, verb = 'dispatch', env = process.env }) {
  const existing = readLedger(target, env) ?? { target, attempts: 0, entries: [] };
  const entry = {
    step,
    detail: String(detail ?? '').slice(0, 2000),
    dispatch_id: dispatchId,
    verb,
    at: new Date().toISOString(),
  };
  const record = {
    target,
    attempts: (existing.attempts ?? 0) + 1,
    entries: [...(existing.entries ?? []), entry].slice(-MAX_ENTRIES),
  };
  writeFileSync(ledgerPath(target, env), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export function recordAgentFailure({ agent, failure, dispatchId, verb = 'dispatch', env = process.env }) {
  return targetsFor(agent).map((target) =>
    recordFailure({ target, step: failure.step, detail: failure.detail, dispatchId, verb, env }),
  );
}

/**
 * History for a set of targets, newest ledger entries included.
 * @returns {Array<{target, attempts, entries}>} one entry per target with history
 */
export function priorFailures(targets, env = process.env) {
  const out = [];
  for (const target of targets) {
    const record = readLedger(target, env);
    if (record && (record.attempts ?? 0) > 0) out.push(record);
  }
  return out;
}

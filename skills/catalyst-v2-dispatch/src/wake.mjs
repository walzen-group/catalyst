// The settle wake: one `herdr agent wait <name> --timeout <ms>` per live agent,
// bare on purpose so blocked and idle fire too. The tool PRESCRIBES that wait and
// never runs it. Running it is the caller's job, as a background job of the
// caller's own harness.
//
// Why the tool cannot run it (measured live 2026-08-01, incident
// 2026-08-01-dispatch-wake-armed-nothing-delivers.md): this CLI is a child of the
// shell the caller's harness spawned for one tool call. A wait spawned here
// `detached` outlives that call and is reparented to init, so its exit is
// observed by nobody — not by this tool, which registered no exit handler and had
// already exited, and not by the caller's harness, which injects a resume notice
// only for background jobs it owns. The recorded failure: a tool-spawned wait
// correctly detected its target's settle and exited on it, and the caller was
// never resumed. A wait whose exit nobody observes is not a wake. So the tool
// hands back the exact command and records the obligation; the caller runs it
// backgrounded and its harness delivers the wake.
//
// Correcting an earlier note in this file, measured the same day: `herdr agent
// wait` against an ALREADY-settled agent returns at once, exit 0, with the agent
// document (~5 ms). It does not "match no transition and time out". So a wait is
// prescribed for every target that is on the roster, settled or not, and a caller
// that runs one on a settled agent gets an immediate answer rather than a hang.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateSubdir } from './ledger.mjs';

export const SETTLED_STATUSES = new Set(['idle', 'done', 'exited', 'settled']);

export function wakeRecordPath(name, env = process.env) {
  return join(stateSubdir('wakes', env), `${encodeURIComponent(name)}.json`);
}

export function readWakeRecord(name, env = process.env) {
  const path = wakeRecordPath(name, env);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** The wait the caller owes for this agent, as a runnable command line. */
export function wakeCommand(name, timeoutMs) {
  return `herdr agent wait ${name} --timeout ${timeoutMs}`;
}

/** Whether a recorded process is still running. */
export function wakeProcessAlive(pid) {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find a live `herdr agent wait <name>` process, whoever owns it. The tool no
 * longer spawns waits, so this is the only honest reading of whether an agent is
 * actually watched: it sees the caller's own harness-run job.
 *
 * A wait whose parent is init (ppid 1) is orphaned — nobody is waiting on it, so
 * its exit will deliver nothing. That one is reported running-but-orphaned and
 * does NOT count as watched.
 *
 * @returns {{running: boolean, pid: number|null, ppid: number|null,
 *            orphaned: boolean, scanned: boolean}}
 */
export function liveWaitFor(name, options = {}) {
  const none = { running: false, pid: null, ppid: null, orphaned: false, scanned: false };
  const ps = spawnSync(options.psBin ?? 'ps', ['-eo', 'pid=,ppid=,args='], { encoding: 'utf8' });
  if (ps.error || typeof ps.stdout !== 'string') return none;

  let orphan = null;
  for (const line of ps.stdout.split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
    if (!match) continue;
    const [, pid, ppid, args] = match;
    if (Number(pid) === process.pid) continue;
    // The process must BE herdr, not merely mention it: a shell wrapper carrying
    // the command in its argv, or a `grep 'herdr agent wait x'`, is not a wait,
    // and counting one would be the same false green this module exists to end.
    const argv = args.split(/\s+/);
    if (argv[0].split('/').pop() !== 'herdr') continue;
    if (argv[1] !== 'agent' || argv[2] !== 'wait') continue;
    // <name> as its own argument, so `foo` never matches a wait on `foo-2`.
    if (argv[3] !== name) continue;
    const entry = { running: true, pid: Number(pid), ppid: Number(ppid), orphaned: Number(ppid) === 1, scanned: true };
    if (!entry.orphaned) return entry;
    orphan = entry;
  }
  return orphan ?? { ...none, scanned: true };
}

/**
 * Record the settle wake the caller owes for this agent. Spawns nothing.
 *
 * The unit is the AGENT, not the call. `herdr agent wait` settles on the agent
 * reaching idle/done/blocked, so one live wait already covers whatever that agent
 * is working on, however many times it has been steered since. A second wait on
 * the same agent would fire on the same settle and buy nothing. So when a live,
 * harness-owned wait is already running for this target, this reports it and asks
 * for no new one; a wake is owed only when the agent is genuinely uncovered.
 *
 * @returns {{owed_by: 'caller', armed_by_tool: false, command: string,
 *            timeout_ms: number, settled_at_return: boolean,
 *            already_running: boolean, existing_wait_pid: number|null,
 *            instruction: string}}
 */
export function prescribeWake({ name, timeoutMs, status, dispatchId = null, env = process.env, options = {} }) {
  const command = wakeCommand(name, timeoutMs);
  const settled = SETTLED_STATUSES.has(status);
  const existing = liveWaitFor(name, options);
  const covered = existing.running && !existing.orphaned;

  const record = {
    name,
    command,
    timeout_ms: timeoutMs,
    dispatch_id: dispatchId,
    owed_by: 'caller',
    armed_by_tool: false,
    status_at_prescribe: status ?? null,
    covered_by_existing_wait: covered ? existing.pid : null,
    at: new Date().toISOString(),
  };
  writeFileSync(wakeRecordPath(name, env), `${JSON.stringify(record, null, 2)}\n`);

  let instruction;
  if (covered) {
    instruction = `${name} is already covered by a live wait you own (pid ${existing.pid}), which fires when it next settles. Arm nothing further: one wait per agent covers every steer sent to it.`;
  } else if (settled) {
    instruction = `${name} had already settled when this call returned; read it now. If it is going back to work, run \`${command}\` as a background job of YOUR harness before ending the turn.`;
  } else {
    instruction = `${name} is live and UNWATCHED until you run \`${command}\` as a background job of YOUR harness (Claude Code: run_in_background: true). This tool cannot wake you: a wait it spawned would be orphaned and its exit would reach nobody.`;
  }

  return {
    owed_by: 'caller',
    armed_by_tool: false,
    command,
    timeout_ms: timeoutMs,
    settled_at_return: settled,
    already_running: covered,
    existing_wait_pid: covered ? existing.pid : null,
    instruction,
  };
}

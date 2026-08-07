// status: one on-demand health read of a roster. Detection only — it kills
// nothing, restarts nothing, re-arms nothing. The classification is the answer;
// the response belongs to the caller and the skills.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { spawnSync } from 'node:child_process';
import { herdrRun, parseReply, rosterAgents } from './herdr.mjs';
import { loadResult } from './result.mjs';
import { liveIndicatorLines, readVisible } from './screens.mjs';
import { liveWaitFor, readWakeRecord, wakeCommand } from './wake.mjs';

const IN_FLIGHT = new Set(['working', 'blocked']);
const SETTLED = new Set(['idle', 'done', 'exited', 'settled']);
// The caller owes no wait on its own name: its own pane is the caller, not a
// monitored agent, and a wait armed on it settles immediately and wakes nobody
// (incident 2026-08-04-orchestrator-self-wait). herdr sets HERDR_TAB_ID and
// HERDR_PANE_ID in every agent pane; the roster entries carry the same ids.
const SELF_WAIT_NOTE = 'this is your own pane: you are the caller, not a monitored agent. No wait is owed on your own name; a wait you arm on yourself settles immediately and wakes nobody. Arm waits only for the agents you monitor';
// Claude Code reports background shells in two places on a settled screen: the
// turn footer ("N shells still running") and the status line ("· N shells ·").
// Observed live 2026-08-01 on meta-cdv1-w4; `herdr agent get` carries no such
// field, so the terminal is the only reading available.
//
// Both patterns are read off the live lines only. A capture carries the whole
// visible buffer, and a transcript that quotes the indicator (a report about
// this very feature did, live 2026-08-01) would otherwise read as a running
// shell, which inverts the row this reading exists to protect.
const SHELLS_RUNNING = /\b(\d+)\s+shells?\s+still\s+running\b/i;
const SHELLS_STATUS_LINE = /[·|]\s*(\d+)\s+shells?\s*[·|]/;
const META_PREFIXES = ['meta-', 'meta_'];

/**
 * Worker or meta. The name prefix is the convention and the only signal: a name
 * starting with `meta-`/`meta_` is a meta, anything else is a worker. The
 * recorded brief is not a role signal, since a worker brief legitimately
 * contains "hand back" (observed live 2026-08-02 on `impl-kind-preflight`).
 */
export function roleFor(name) {
  if (META_PREFIXES.some((prefix) => name.startsWith(prefix))) return 'meta';
  return 'worker';
}

function agentGet(name, options) {
  const run = herdrRun(['agent', 'get', name], options);
  if (run.status !== 0) return null;
  const reply = parseReply(run.stdout);
  if (reply === null || reply.error) return null;
  return reply.result?.agent ?? null;
}

function tokensSpent(tokens) {
  if (!tokens || typeof tokens !== 'object') return false;
  return Object.values(tokens).some((value) => {
    const number = Number.parseFloat(String(value).replace(/[,_]/g, ''));
    return Number.isFinite(number) && number > 0;
  });
}

/**
 * Background shells a captured screen reports live, or null when none does.
 * Only the turn footer and the status lines count; the transcript body is
 * whatever the agent happened to print.
 */
export function backgroundShells(screen) {
  for (const line of liveIndicatorLines(screen)) {
    const match = SHELLS_RUNNING.exec(line) ?? SHELLS_STATUS_LINE.exec(line);
    if (match === null) continue;
    const count = Number.parseInt(match[1], 10);
    if (Number.isFinite(count) && count > 0) return count;
  }
  return null;
}

/**
 * A settled agent's shell reading. A settled foreground turn with background
 * shells still running is an agent parked mid-work, not one that retired: it
 * re-enters when a shell or a wake reports back (user directive, 2026-08-01).
 */
function shellReading(name, status, options) {
  if (!SETTLED.has(status)) return { shells: null, parked: false, note: null };
  let screen;
  try {
    screen = readVisible(name, options);
  } catch (error) {
    return { shells: null, parked: false, note: `the screen could not be read: ${error.message}` };
  }
  const shells = backgroundShells(screen);
  return {
    shells,
    parked: shells !== null,
    note: shells === null
      ? 'settled with no background shell on screen'
      : `settled with ${shells} background shell${shells === 1 ? '' : 's'} still running: parked, not retired`,
  };
}

/** In flight, or settled with background shells still running. */
function stillWorking(agent) {
  return IN_FLIGHT.has(agent.status) || agent.parked_monitoring === true;
}

/**
 * The caller's own herdr tab/pane ids, when this CLI runs inside an agent
 * pane. Absent outside herdr (a plain shell), where no self-exclusion applies.
 */
function callerSelfId(env = process.env) {
  const tabId = env.HERDR_TAB_ID ?? null;
  const paneId = env.HERDR_PANE_ID ?? null;
  if (tabId === null && paneId === null) return null;
  return { tabId, paneId };
}

/**
 * Whether this entry's wake is missing. Only an entry that carries a wake
 * reading counts, so a hand-built roster without one is not read as a gap.
 * The caller's own entry is never a gap: the caller owes no wait on itself.
 */
function wakeMissing(agent) {
  if (agent.caller_self === true) return false;
  return stillWorking(agent)
    && agent.wake !== undefined && agent.wake !== null
    && agent.wake.running === false;
}

/**
 * 01's detection table, read off the roster. Five names, no sixth: the wake-gap
 * and blocked-meta cases land on the nearest row and say why in `reason`.
 *
 * 01's healthy row reads "every in-flight worker has a meta working or handed
 * back, wakes armed", so a wave missing wakes is not healthy however busy its
 * meta is, and a meta that is itself blocked is not a meta at work.
 */
export function classify(agents) {
  // The caller's own entry is not a dispatched worker: it never needs a meta
  // and never needs a wait (incident 2026-08-04-orchestrator-self-wait).
  const workers = agents.filter((agent) => agent.role === 'worker' && agent.caller_self !== true);
  const metas = agents.filter((agent) => agent.role === 'meta');
  const workersInFlight = workers.filter(stillWorking);
  if (workersInFlight.length === 0) return { classification: 'healthy', reason: 'no worker is in flight' };
  if (metas.length === 0) return { classification: 'UNWATCHED', reason: 'workers are in flight with no meta-agent on the roster' };

  // Every meta is tested for the camouflage reading before any healthy verdict:
  // one working meta beside an unbriefed one is still an unbriefed meta. A meta
  // parked on background shells has spent its turn, so it is not that reading.
  const unbriefed = metas.filter((meta) => meta.status === 'idle' && !meta.tokens_spent && meta.parked_monitoring !== true);
  if (unbriefed.length > 0) {
    return {
      classification: 'UNBRIEFED META',
      reason: `${unbriefed.map((meta) => meta.name).join(', ')} is idle at zero tokens: the camouflage reading`,
    };
  }

  // A meta parked on background shells satisfies 01's "working or handed back":
  // it re-enters when a shell or a wake reports back.
  const atWork = metas.filter((meta) => meta.status === 'working' || meta.parked_monitoring === true);
  if (atWork.length === 0) {
    const blocked = metas.filter((meta) => meta.status === 'blocked');
    if (blocked.length > 0) {
      return {
        classification: 'UNWATCHED',
        reason: `${blocked.map((meta) => meta.name).join(', ')} is blocked, so no meta is at work while workers are in flight`,
      };
    }
    const gone = metas.filter((meta) => meta.present === false);
    if (gone.length > 0) {
      return {
        classification: 'UNWATCHED',
        reason: `${gone.map((meta) => meta.name).join(', ')} is not on the roster while workers are in flight`,
      };
    }
    // A settled meta whose session is still live is the omp between-turn park:
    // its own harness resumes it on a worker settle, so the read is not proof
    // of retirement. Only an exited session, an absent roster entry, or the
    // meta's declared hand-back is retirement; a one-shot read cannot tell
    // parked from dead, so the caller probes before replacing (incident
    // 2026-08-03-meta-retirement-misdiagnosis).
    const exited = metas.filter((meta) => meta.status === 'exited');
    if (exited.length > 0) {
      return {
        classification: 'META RETIRED EARLY',
        reason: `${exited.map((meta) => meta.name).join(', ')} is exited while workers are still in flight`,
      };
    }
    return {
      classification: 'META QUIESCENT',
      reason: `${metas.map((meta) => meta.name).join(', ')} is settled with no background shell while its session is still live: an omp meta between turns reads this way. Probe-and-verify before replacing: a steer that must produce new content (or revision movement across two status reads); a delivery receipt is not content. Never run two metas on one wave`,
    };
  }

  const gaps = agents.filter(wakeMissing).map((agent) => agent.name);
  if (gaps.length > 0) {
    return {
      classification: 'UNWATCHED',
      reason: `a meta is at work, but no live wait is running for ${gaps.join(', ')}: a settle would go unnoticed`,
    };
  }
  return { classification: 'healthy', reason: 'every in-flight worker has a meta at work and a live wait running' };
}

function sharedCheckout(path) {
  const run = spawnSync('git', ['-C', path, 'status', '--short'], { encoding: 'utf8' });
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  return { path, status_short: output, clean: run.status === 0 && (run.stdout ?? '').trim() === '' };
}

/**
 * Read a roster's health.
 * @param {{dispatchId, names, sharedCheckout, env, options}} query
 */
export function readStatus({ dispatchId = null, names = null, sharedCheckout: checkoutPath = null, env = process.env, options = {} } = {}) {
  const document = {
    verb: 'status',
    scope: { dispatch_id: dispatchId, agents: names, mode: dispatchId ? 'dispatch' : names ? 'names' : 'roster' },
    classification: null,
    reason: null,
    agents: [],
    wake_gaps: [],
    notes: [],
  };

  let recorded = null;
  if (dispatchId !== null) {
    recorded = loadResult(dispatchId, env);
    if (recorded === null) {
      return { ...document, classification: 'UNREADABLE', reason: `no recorded result for dispatch_id "${dispatchId}"` };
    }
  }

  const rosterRun = herdrRun(['agent', 'list'], options);
  const rosterReply = parseReply(rosterRun.stdout);
  if (rosterRun.status !== 0 || rosterReply === null || rosterReply.error) {
    return {
      ...document,
      classification: 'UNREADABLE',
      reason: 'herdr agent list did not answer',
      herdr_output: { argv: rosterRun.argv, status: rosterRun.status, stdout: rosterRun.stdout, stderr: rosterRun.stderr },
    };
  }
  const roster = rosterAgents(rosterReply);
  const rosterByName = new Map(roster.map((agent) => [agent?.name, agent]));
  const self = callerSelfId(env);

  let targets;
  if (recorded) targets = recorded.agents.map((agent) => agent.name);
  else if (names) targets = names;
  else targets = roster.map((agent) => agent?.name).filter(Boolean);

  for (const name of targets) {
    const live = agentGet(name, options) ?? rosterByName.get(name) ?? null;
    // The caller's own pane, matched on herdr's tab/pane ids. Its entry stays
    // on the roster (the caller sees itself) but is never a monitored agent.
    const callerSelf = self !== null && live !== null
      && ((self.tabId !== null && live.tab_id === self.tabId)
        || (self.paneId !== null && live.pane_id === self.paneId));
    const wakeRecord = callerSelf ? null : readWakeRecord(name, env);
    // Whether this agent is watched is read off the live process table, not off
    // the ledger: the tool no longer runs waits, so the only real wake is the
    // caller's own harness-run job, and an orphaned wait (ppid 1) delivers to
    // nobody however alive it looks.
    const waitProc = callerSelf ? null : liveWaitFor(name, options);
    const shells = live === null
      ? { shells: null, parked: false, note: null }
      : shellReading(name, live.agent_status ?? null, options);
    const entry = {
      name,
      role: roleFor(name),
      caller_self: callerSelf,
      present: live !== null,
      status: live?.agent_status ?? null,
      background_shells: shells.shells,
      parked_monitoring: shells.parked,
      shell_note: shells.note,
      cwd: live?.cwd ?? null,
      session: live?.agent_session ?? null,
      tokens_spent: tokensSpent(live?.tokens),
      revision: live?.revision ?? null,
      wake: callerSelf
        ? {
            prescribed: false,
            command: null,
            timeout_ms: null,
            running: false,
            pid: null,
            ppid: null,
            orphaned: false,
            note: SELF_WAIT_NOTE,
          }
        : {
            prescribed: wakeRecord !== null,
            command: wakeRecord?.command ?? wakeCommand(name, wakeRecord?.timeout_ms ?? 900000),
            timeout_ms: wakeRecord?.timeout_ms ?? null,
            running: waitProc.running && !waitProc.orphaned,
            pid: waitProc.pid,
            ppid: waitProc.ppid,
            orphaned: waitProc.orphaned,
            note: waitProc.running && !waitProc.orphaned
              ? 'a live wait is running for this agent and its owner will be woken'
              : waitProc.orphaned
                ? 'a wait for this agent is running but ORPHANED (ppid 1): nobody is waiting on it, so its exit wakes no one. Run the command above as a background job of your own harness'
                : 'no live wait is running for this agent: a settle would go unnoticed. Run the command above as a background job of your own harness',
          },
    };
    if (!entry.present) document.notes.push(`${name} is not on the roster`);
    if (entry.parked_monitoring) document.notes.push(`${name}: ${entry.shell_note}`);
    if (wakeMissing(entry)) document.wake_gaps.push(name);
    document.agents.push(entry);
  }

  const verdict = classify(document.agents);
  document.classification = verdict.classification;
  document.reason = verdict.reason;
  if (document.wake_gaps.length > 0) {
    document.notes.push(`wake gap: no live wait is running for ${document.wake_gaps.join(', ')}; run each agent's wake command as a background job of your own harness`);
  }
  if (checkoutPath) document.shared_checkout = sharedCheckout(checkoutPath);
  return document;
}

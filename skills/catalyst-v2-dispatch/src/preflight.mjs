// Pure refusal rules over a validated input plus the live agent roster.
// Filesystem reads only; nothing here spawns herdr.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { accessSync, constants, statSync } from 'node:fs';

/**
 * Names currently held by live agents. Accepts either the `agents` array or a
 * whole `herdr agent list` reply; unnamed agents are skipped.
 */
export function rosterNames(roster) {
  const agents = Array.isArray(roster) ? roster : (roster?.result?.agents ?? roster?.agents);
  if (!Array.isArray(agents)) return new Set();
  return new Set(agents.map((agent) => agent?.name).filter((name) => typeof name === 'string' && name !== ''));
}

// Meta detection is NAME PREFIX ONLY, here and in status.mjs `roleFor`: a name
// starting with `meta-`/`meta_` is a meta. A worker brief legitimately contains
// "hand back" (observed live 2026-08-02 on `impl-kind-preflight`), so a
// brief-text heuristic would misread such a worker as a meta and let it bypass
// the gate, or falsely satisfy the meta requirement for other workers. The
// `meta-` name prefix is the reliable convention (every meta is named `meta-*`).
const META_PREFIXES = ['meta-', 'meta_'];

function nameIsMeta(name) {
  return typeof name === 'string' && META_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function agentIsMeta(agent) {
  return nameIsMeta(agent?.name);
}

// The Curator launches under one reserved name. Detection off the roster is by
// name (the roster carries names, not kinds), consistent with meta's name-prefix
// convention; in a launch call the `kind: "curator"` field settles it too.
const CURATOR_NAME = 'the-curator';

function nameIsCurator(name) {
  return name === CURATOR_NAME;
}

function agentIsCurator(agent) {
  return agent?.kind === 'curator' || nameIsCurator(agent?.name);
}

// The meta gate lets a worker launch only with a meta present; unit, meta, and
// curator are the roles that never need one. The curator loop uses no meta.
function isExemptFromMetaGate(agent) {
  return agent?.kind === 'unit' || agentIsCurator(agent) || agentIsMeta(agent);
}

function statOrNull(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

/**
 * Whether a path sits inside a `.cortex/` tree: a `.cortex` directory segment
 * somewhere above the file. This is the one gate on file-mode input — a plan or
 * spec doc for a preplanned task lives under `.cortex/`, and nothing else (a
 * /tmp scratch file, a home-dir path) is an acceptable file input.
 */
export function isCortexPath(path) {
  return String(path ?? '').split(/[\\/]+/).includes('.cortex');
}

/**
 * Whether a path sits inside a `.cortex/incidents/` tree: a `.cortex` segment
 * immediately followed by an `incidents` segment. A repair dispatch's incident
 * reference must point here, and nowhere else under `.cortex/` (a plan or a
 * report doc is not an incident record).
 */
export function isIncidentPath(path) {
  const segments = String(path ?? '').split(/[\\/]+/);
  const index = segments.indexOf('.cortex');
  return index >= 0 && segments[index + 1] === 'incidents';
}

/**
 * A path that file mode will accept: under a `.cortex/` tree, present, a file.
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function requireCortexDoc(path) {
  if (!isCortexPath(path)) {
    return {
      ok: false,
      reason: `"${path}" is not under a .cortex/ tree; file mode accepts only a cortex plan/spec doc. Pass inline input instead (stdin for dispatch, --text for steer)`,
    };
  }
  const stat = statOrNull(path);
  if (stat === null) return { ok: false, reason: `"${path}" does not exist` };
  if (!stat.isFile()) return { ok: false, reason: `"${path}" is not a file` };
  return { ok: true };
}

/**
 * Every refusal rule that needs the world outside the input document. All
 * failures are collected; the caller sees the whole list, not the first one.
 * Model and effort/thinking namedness are schema rules and are not re-asserted.
 * @returns {{ok: boolean, failures: string[]}}
 */
export function preflight(input, roster) {
  const failures = [];
  const live = rosterNames(roster);
  const seen = new Map();

  for (const [index, agent] of (input.agents ?? []).entries()) {
    const path = `agents[${index}].`;

    const cwdStat = statOrNull(agent.cwd);
    if (cwdStat === null) {
      failures.push(`${path}cwd: "${agent.cwd}" does not exist`);
    } else if (!cwdStat.isDirectory()) {
      failures.push(`${path}cwd: "${agent.cwd}" is not a directory`);
    }

    if (agent.brief?.mode === 'spec_pointer') {
      const specPath = agent.brief.spec_path;
      if (!isCortexPath(specPath)) {
        failures.push(`${path}brief.spec_path: "${specPath}" is not under a .cortex/ tree; a spec pointer must reference a cortex plan/spec doc`);
      } else {
        const specStat = statOrNull(specPath);
        if (specStat === null) {
          failures.push(`${path}brief.spec_path: "${specPath}" does not exist`);
        } else if (!specStat.isFile()) {
          failures.push(`${path}brief.spec_path: "${specPath}" is not a file`);
        }
      }
    }

    if (agent.style_file !== undefined && agent.style_file !== null) {
      const styleStat = statOrNull(agent.style_file);
      let readable = false;
      if (styleStat !== null && styleStat.isFile()) {
        try {
          accessSync(agent.style_file, constants.R_OK);
          readable = true;
        } catch {
          readable = false;
        }
      }
      if (!readable) {
        failures.push(`${path}style_file: "${agent.style_file}" does not exist or is not readable`);
      }
    }

    // A repair dispatch must carry an incident: present, under a
    // `.cortex/incidents/` tree, and an existing file. Worker-like otherwise (the
    // meta gate below still applies, since a repair is not exempt). Same
    // filesystem existence pattern as spec_path/style_file; one failure per fault.
    if (agent.kind === 'repair') {
      const incidentPath = agent.incident_path;
      if (incidentPath === undefined || incidentPath === null || incidentPath === '') {
        failures.push(`${path}incident_path: "${agent.name}" is a repair but names no incident; a repair dispatch must reference an incident report under a .cortex/incidents/ tree`);
      } else if (!isIncidentPath(incidentPath)) {
        failures.push(`${path}incident_path: "${incidentPath}" is not under a .cortex/incidents/ tree; a repair ("${agent.name}") must reference an incident report`);
      } else {
        const incidentStat = statOrNull(incidentPath);
        if (incidentStat === null) {
          failures.push(`${path}incident_path: "${incidentPath}" does not exist`);
        } else if (!incidentStat.isFile()) {
          failures.push(`${path}incident_path: "${incidentPath}" is not a file`);
        }
      }
    }

    if (seen.has(agent.name)) {
      failures.push(`${path}name: "${agent.name}" duplicates agents[${seen.get(agent.name)}].name`);
    } else {
      seen.set(agent.name, index);
    }

    if (live.has(agent.name)) {
      failures.push(`${path}name: "${agent.name}" is already live on the herdr roster`);
    }
  }

  // Roster-aware worker-needs-meta gate. A worker (kind is not `unit` and the
  // agent is not itself a meta) may launch only when a meta is present: another
  // meta in this same call, or a live `meta-*` already on the roster. Collected
  // with the rest, one failure per uncovered worker.
  const agents = input.agents ?? [];
  const metaPresent = agents.some(agentIsMeta) || [...live].some(nameIsMeta);
  if (!metaPresent) {
    for (const [index, agent] of agents.entries()) {
      if (isExemptFromMetaGate(agent)) continue;
      failures.push(`agents[${index}].kind: "${agent.name}" is a worker but no meta-agent is present in this call or live on the roster; dispatch a meta in the same call, or set kind: "unit" if this is an exempt catalyst unit (orchestrator, board keeper, test actor/judge)`);
    }
  }

  // Single-writer: a curator mutates the shared memory store, so at most one may
  // be live. A curator launch is refused when a curator is already live on the
  // roster, or when another curator rides in the same call. One failure per
  // offending curator, collected with the rest.
  const liveCuratorName = [...live].find(nameIsCurator) ?? null;
  const callCuratorIndexes = agents
    .map((agent, index) => (agentIsCurator(agent) ? index : -1))
    .filter((index) => index >= 0);
  for (const index of callCuratorIndexes) {
    const otherInCall = callCuratorIndexes.find((other) => other !== index);
    const conflictName = liveCuratorName ?? (otherInCall !== undefined ? agents[otherInCall].name : null);
    if (conflictName !== null) {
      failures.push(`a curator is already live (${conflictName}); the memory store is single-writer, retire it before curating again`);
    }
  }

  if (input.workspace?.create_cwd !== undefined) {
    const stat = statOrNull(input.workspace.create_cwd);
    if (stat === null) {
      failures.push(`workspace.create_cwd: "${input.workspace.create_cwd}" does not exist`);
    } else if (!stat.isDirectory()) {
      failures.push(`workspace.create_cwd: "${input.workspace.create_cwd}" is not a directory`);
    }
  }

  return { ok: failures.length === 0, failures };
}

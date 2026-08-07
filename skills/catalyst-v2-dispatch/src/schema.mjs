// Pure validation of a `dispatch` input document. No I/O, no herdr, no fs.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

const TOP_KEYS = new Set([
  'dispatch_id',
  'workspace',
  'agents',
  'heartbeat_ms',
  'on_failure',
  'screen_answers',
  'mandate_mode',
]);
const WORKSPACE_KEYS = new Set(['label', 'create_cwd']);
const AGENT_KEYS = new Set([
  'name',
  'cwd',
  'cli',
  'model',
  'effort',
  'thinking',
  'brief',
  'focus',
  'kind',
  'style_file',
  'user_triggered',
  'user_directive',
]);
const BRIEF_KEYS = new Set(['mode', 'spec_path', 'text']);

const BASE_EFFORTS = ['low', 'medium', 'high'];
const GATED_EFFORTS = ['xhigh', 'max'];
const BRIEF_MODES = ['spec_pointer', 'inline'];
const ON_FAILURE = ['abort', 'continue'];
// Dispatch delivery either injects the pinned catalyst mandate ahead of the
// brief (injected, the default) or sends the caller's brief unchanged
// (caller_owned). caller_owned is valid only for an all-unit wave: the caller
// owns the complete prompt, so no worker, meta, or curator may ride it.
const MANDATE_MODES = ['injected', 'caller_owned'];
// A worker needs a meta present (preflight enforces it); a unit is exempt. A
// curator is its own kind for the memory-curation loop: exempt from the meta
// gate and held to a single-writer rule (both in preflight).
const AGENT_KINDS = ['worker', 'unit', 'curator'];

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
// `null` is the design doc's own way of spelling "this agent has no effort /
// no thinking" (01's example carries "thinking": null on a claude agent).
const isAbsent = (v) => v === undefined || v === null;

function checkUnknown(obj, allowed, path, errors) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) errors.push(`${path}${key}: unknown key`);
  }
}

function requireString(obj, key, path, errors) {
  const value = obj[key];
  if (isAbsent(value)) {
    errors.push(`${path}${key}: required`);
    return null;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${path}${key}: must be a non-empty string`);
    return null;
  }
  return value;
}

function optionalBoolean(obj, key, path, errors) {
  const value = obj[key];
  if (isAbsent(value)) return false;
  if (typeof value !== 'boolean') {
    errors.push(`${path}${key}: must be a boolean`);
    return false;
  }
  return value;
}

function validateWorkspace(workspace, errors) {
  if (!isObject(workspace)) {
    errors.push('workspace: must be an object');
    return undefined;
  }
  checkUnknown(workspace, WORKSPACE_KEYS, 'workspace.', errors);
  const label = requireString(workspace, 'label', 'workspace.', errors);
  const out = { label };
  if (!isAbsent(workspace.create_cwd)) {
    out.create_cwd = requireString(workspace, 'create_cwd', 'workspace.', errors);
  }
  return out;
}

function validateBrief(brief, path, errors) {
  if (!isObject(brief)) {
    errors.push(`${path}brief: required, must be an object`);
    return undefined;
  }
  const briefPath = `${path}brief.`;
  checkUnknown(brief, BRIEF_KEYS, briefPath, errors);

  const mode = brief.mode;
  if (isAbsent(mode)) {
    errors.push(`${briefPath}mode: required`);
  } else if (!BRIEF_MODES.includes(mode)) {
    errors.push(`${briefPath}mode: must be one of ${BRIEF_MODES.join(', ')}`);
  }

  const text = requireString(brief, 'text', briefPath, errors);

  let specPath;
  if (mode === 'spec_pointer') {
    specPath = requireString(brief, 'spec_path', briefPath, errors);
  } else if (mode === 'inline' && !isAbsent(brief.spec_path)) {
    errors.push(`${briefPath}spec_path: forbidden when mode is inline`);
  }

  const out = { mode, text };
  if (specPath) out.spec_path = specPath;
  return out;
}

function validateAgent(agent, index, errors) {
  const path = `agents[${index}].`;
  if (!isObject(agent)) {
    errors.push(`${path}: must be an object`);
    return undefined;
  }
  checkUnknown(agent, AGENT_KEYS, path, errors);

  const name = requireString(agent, 'name', path, errors);
  const cwd = requireString(agent, 'cwd', path, errors);
  const cli = requireString(agent, 'cli', path, errors);
  const model = requireString(agent, 'model', path, errors);

  const userDirective = optionalBoolean(agent, 'user_directive', path, errors);
  const userTriggered = optionalBoolean(agent, 'user_triggered', path, errors);
  const focus = optionalBoolean(agent, 'focus', path, errors);
  if (focus && !userTriggered) {
    errors.push(`${path}focus: true requires user_triggered: true on the same agent`);
  }

  const hasEffort = !isAbsent(agent.effort);
  const hasThinking = !isAbsent(agent.thinking);
  let effort;
  let thinking;

  if (hasEffort) {
    effort = requireString(agent, 'effort', path, errors);
    if (effort && !BASE_EFFORTS.includes(effort)) {
      if (GATED_EFFORTS.includes(effort)) {
        if (!userDirective) {
          errors.push(
            `${path}effort: "${effort}" requires user_directive: true on the same agent`,
          );
        }
      } else {
        errors.push(
          `${path}effort: must be one of ${[...BASE_EFFORTS, ...GATED_EFFORTS].join(', ')}`,
        );
      }
    }
  }
  if (hasThinking) thinking = requireString(agent, 'thinking', path, errors);

  if (cli === 'claude') {
    // Effort is optional for claude: omitted means the CLI's built-in default.
    if (hasThinking) errors.push(`${path}thinking: forbidden for cli "claude"`);
  } else if (cli === 'omp') {
    if (!hasThinking) errors.push(`${path}thinking: required for cli "omp"`);
    if (hasEffort) errors.push(`${path}effort: forbidden for cli "omp"`);
  } else if (cli) {
    if (hasEffort && hasThinking) {
      errors.push(`${path}effort: name either effort or thinking for cli "${cli}", not both`);
    } else if (!hasEffort && !hasThinking) {
      errors.push(`${path}effort: name effort or thinking for cli "${cli}", no default exists`);
    }
  }

  let kind = 'worker';
  if (!isAbsent(agent.kind)) {
    if (typeof agent.kind !== 'string' || !AGENT_KINDS.includes(agent.kind)) {
      errors.push(`${path}kind: must be one of ${AGENT_KINDS.join(', ')}`);
    } else {
      kind = agent.kind;
    }
  }

  let styleFile;
  if (!isAbsent(agent.style_file)) {
    styleFile = requireString(agent, 'style_file', path, errors);
  }

  const brief = validateBrief(agent.brief, path, errors);

  const out = { name, cwd, cli, model, kind, brief, focus, user_triggered: userTriggered, user_directive: userDirective };
  if (hasEffort) out.effort = effort;
  if (hasThinking) out.thinking = thinking;
  if (styleFile) out.style_file = styleFile;
  return out;
}

function validateScreenAnswers(screenAnswers, errors) {
  if (!isObject(screenAnswers)) {
    errors.push('screen_answers: must be an object mapping screen name to keys');
    return undefined;
  }
  for (const [key, value] of Object.entries(screenAnswers)) {
    if (typeof value !== 'string' || value === '') {
      errors.push(`screen_answers.${key}: must be a non-empty string`);
    }
  }
  return { ...screenAnswers };
}

/**
 * Validate a parsed dispatch input document.
 * @returns {{ok: true, value: object} | {ok: false, errors: string[]}}
 */
export function validateDispatchInput(obj) {
  const errors = [];
  if (!isObject(obj)) {
    return { ok: false, errors: ['input: must be a JSON object'] };
  }
  checkUnknown(obj, TOP_KEYS, '', errors);

  const dispatchId = requireString(obj, 'dispatch_id', '', errors);

  let workspace;
  if (!isAbsent(obj.workspace)) workspace = validateWorkspace(obj.workspace, errors);

  let heartbeatMs;
  if (isAbsent(obj.heartbeat_ms)) {
    errors.push('heartbeat_ms: required');
  } else if (typeof obj.heartbeat_ms !== 'number' || !Number.isFinite(obj.heartbeat_ms)) {
    errors.push('heartbeat_ms: must be a number of milliseconds');
  } else if (obj.heartbeat_ms <= 0) {
    errors.push('heartbeat_ms: must be greater than 0');
  } else {
    heartbeatMs = obj.heartbeat_ms;
  }

  let onFailure = 'abort';
  if (!isAbsent(obj.on_failure)) {
    if (!ON_FAILURE.includes(obj.on_failure)) {
      errors.push(`on_failure: must be one of ${ON_FAILURE.join(', ')}`);
    } else {
      onFailure = obj.on_failure;
    }
  }

  let screenAnswers;
  if (!isAbsent(obj.screen_answers)) screenAnswers = validateScreenAnswers(obj.screen_answers, errors);

  let mandateMode = 'injected';
  if (!isAbsent(obj.mandate_mode)) {
    if (typeof obj.mandate_mode !== 'string' || !MANDATE_MODES.includes(obj.mandate_mode)) {
      errors.push(`mandate_mode: must be one of ${MANDATE_MODES.join(', ')}`);
    } else {
      mandateMode = obj.mandate_mode;
    }
  }

  let agents = [];
  if (isAbsent(obj.agents)) {
    errors.push('agents: required');
  } else if (!Array.isArray(obj.agents)) {
    errors.push('agents: must be an array');
  } else if (obj.agents.length === 0) {
    errors.push('agents: must name at least one agent');
  } else {
    agents = obj.agents.map((agent, index) => validateAgent(agent, index, errors));
    const seen = new Map();
    for (const [index, agent] of agents.entries()) {
      const name = agent?.name;
      if (!name) continue;
      if (seen.has(name)) {
        errors.push(`agents[${index}].name: "${name}" duplicates agents[${seen.get(name)}].name`);
      } else {
        seen.set(name, index);
      }
    }
  }

  // caller_owned hands the caller the complete prompt, so every agent in the
  // wave must be a unit: a worker, meta, or curator would otherwise receive a
  // brief with no mandate and no role bootstrap.
  if (mandateMode === 'caller_owned') {
    for (const [index, agent] of agents.entries()) {
      if (agent && agent.kind !== 'unit') {
        errors.push(`agents[${index}].kind: mandate_mode "caller_owned" requires kind "unit" on every agent; "${agent.name}" is a "${agent.kind}"`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const value = { dispatch_id: dispatchId, agents, heartbeat_ms: heartbeatMs, on_failure: onFailure, mandate_mode: mandateMode };
  if (workspace) value.workspace = workspace;
  if (screenAnswers) value.screen_answers = screenAnswers;
  return { ok: true, value };
}

/**
 * Launch-command tail for a validated agent: the model plus its capability
 * level, in the flag spelling its CLI kind uses.
 */
export function modelTail(agent) {
  const args = ['--model', agent.model];
  if (agent.effort !== undefined) args.push('--effort', agent.effort);
  if (agent.thinking !== undefined) args.push('--thinking', agent.thinking);
  return args;
}

// Arg parsing, verb routing, JSON in / JSON out.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { readFileSync } from 'node:fs';
import { modelTail, validateDispatchInput } from './schema.mjs';
import { styleArgs } from './launch.mjs';
import { preflight, requireCortexDoc } from './preflight.mjs';
import { fetchRoster } from './herdr.mjs';
import { runDispatch as runDispatchPlan } from './dispatch.mjs';
import { steerAgent } from './steer.mjs';
import { readStatus } from './status.mjs';

const USAGE = `c2d — deterministic herdr launch wrapper

Usage:
  c2d dispatch [--dry-run]                       (input JSON on stdin)
  c2d steer --agent <name> --text <string>
                             [--expect <keyword>] [--wake-timeout <ms>]
  c2d steer --agent <name> --file <.cortex path>
                             [--expect <keyword>] [--wake-timeout <ms>]
  c2d status [--dispatch-id <id> | --agents <a,b,...>]
                              [--shared-checkout <path>]

dispatch reads its input JSON document on stdin only. Pipe it inline (a heredoc
at the call site); to reference a plan or spec doc, use brief.spec_path inside
the input. There is no --file and no positional input argument for dispatch.

steer takes its input one of two ways, named by the flag itself, exactly one per
call: an inline directive on --text, or a --file path that must be a cortex
plan/spec doc under a .cortex/ tree — a preplanned task document, never a /tmp or
other path. Passing both, or neither, is refused.

dispatch  launch a wave: every agent verified live in its cwd, on the brief
          delivered, with a wake armed. The result document goes to stdout.
steer     re-prompt one running agent. Reads before it sends, returns a
          pending question instead of answering it, refuses a composer holding
          text it cannot attribute to its own delivery ledger, and arms a settle
          wake so the re-prompted agent is never left unwatched.
  status    classify a roster's health: healthy, UNWATCHED, UNBRIEFED META,
          META QUIESCENT, or META RETIRED EARLY. Detection only.

Options:
  --file <path>          steer: file-mode input; refused unless the path is a
                         cortex plan/spec doc under a .cortex/ tree
  --dry-run              dispatch: validate and print the launch plan, launch nothing
  --agent <name>         steer: the agent to re-prompt
  --text <string>        steer: the directive to send inline
  --expect <keyword>     steer: grep the post-send read, reported not gated
  --wake-timeout <ms>    steer: settle-wake timeout to arm (default 900000)
  --dispatch-id <id>     status: check exactly the agents of a recorded dispatch
  --agents <a,b>         status: check these names; bare checks the whole roster
  --shared-checkout <p>  status: also report git status --short of <p>
  --help                 print this text

Exit 0 when the verb did what it was asked; 1 on any refusal or failure.
status exits 0 whenever it could read the roster: the classification is in the
document, not the exit code.

Test seam: set CATALYST_DISPATCH_ROSTER_JSON to a file path to read the agent
roster from it instead of herdr. Test-only; not a workflow feature.
`;

function emit(out, document) {
  out.write(`${JSON.stringify(document, null, 2)}\n`);
}

function failed(out, failures) {
  emit(out, { status: 'failed', failures });
  return 1;
}

async function readStdin(stdin) {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

const DISPATCH_FILE_REMOVED = 'dispatch reads its input on stdin only; --file was removed. Pipe the JSON inline (a heredoc at the call site). To reference a plan or spec doc, use brief.spec_path inside the input.';

function parseDispatchArgs(args) {
  const parsed = { dryRun: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--file') {
      return { error: DISPATCH_FILE_REMOVED };
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else if (arg.startsWith('--')) {
      return { error: `${arg}: unknown option` };
    } else {
      return {
        error: `${arg}: unexpected positional argument; dispatch input comes on stdin`,
      };
    }
  }
  return { value: parsed };
}

function launchPlan(input) {
  return {
    status: 'ok',
    mode: 'dry-run',
    dispatch_id: input.dispatch_id,
    workspace: input.workspace ?? null,
    heartbeat_ms: input.heartbeat_ms,
    on_failure: input.on_failure,
    agents: input.agents.map((agent) => {
      const tail = modelTail(agent);
      const launchArgs = [...tail, ...styleArgs(agent)];
      return {
        name: agent.name,
        cwd: agent.cwd,
        cli: agent.cli,
        model: agent.model,
        effort: agent.effort ?? null,
        thinking: agent.thinking ?? null,
        focus: agent.focus,
        kind: agent.kind,
        style_file: agent.style_file ?? null,
        brief_mode: agent.brief.mode,
        spec_path: agent.brief.spec_path ?? null,
        launch_args: launchArgs,
        model_tail: tail.join(' '),
      };
    }),
  };
}

async function runDispatch(args, io) {
  const { out } = io;
  const parsedArgs = parseDispatchArgs(args);
  if (parsedArgs.help) { out.write(USAGE); return 0; }
  if (parsedArgs.error) return failed(out, [parsedArgs.error]);
  const { dryRun } = parsedArgs.value;

  // One input mode: the inline JSON document on stdin. stdin is read only when it
  // is not a TTY, so dispatch never blocks on a terminal that will never send input.
  let stdinText = '';
  if (!(io.stdin && io.stdin.isTTY)) {
    try {
      stdinText = await readStdin(io.stdin);
    } catch (error) {
      return failed(out, [`input: ${error.message}`]);
    }
  }
  if (stdinText.trim() === '') {
    return failed(out, ['dispatch: no input; pipe the JSON document on stdin']);
  }
  const text = stdinText;

  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return failed(out, [`input: strict JSON parse error: ${error.message}`]);
  }

  const schema = validateDispatchInput(raw);
  if (!schema.ok) return failed(out, schema.errors);

  const rosterJson = process.env.CATALYST_DISPATCH_ROSTER_JSON ?? null;
  let roster;
  try {
    roster = rosterJson === null
      ? (io.fetchRoster ?? fetchRoster)()
      : JSON.parse(readFileSync(rosterJson, 'utf8'));
  } catch (error) {
    const detail = error?.herdrError ? JSON.stringify(error.toJSON()) : error.message;
    return failed(out, [`roster: ${detail}`]);
  }

  const gate = preflight(schema.value, roster);
  if (!gate.ok) return failed(out, gate.failures);

  if (dryRun) {
    emit(out, launchPlan(schema.value));
    return 0;
  }

  const { document } = runDispatchPlan(schema.value, { env: process.env });
  emit(out, document);
  return document.status === 'ok' ? 0 : 1;
}

/** Flag parsing for the two handle-driven verbs. */
function parseFlags(args, spec) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (!arg.startsWith('--')) return { error: `${arg}: unexpected argument` };
    const key = arg.slice(2);
    if (!spec.includes(key)) return { error: `${arg}: unknown option` };
    i += 1;
    if (i >= args.length) return { error: `${arg}: needs a value` };
    parsed[key] = args[i];
  }
  return { value: parsed };
}

function runSteer(args, io) {
  const { out } = io;
  const parsed = parseFlags(args, ['agent', 'text', 'file', 'expect', 'wake-timeout']);
  if (parsed.help) { out.write(USAGE); return 0; }
  if (parsed.error) return failed(out, [parsed.error]);
  const flags = parsed.value;
  if (!flags.agent) return failed(out, ['steer: --agent <name> is required']);

  // Two input modes, named by the flag itself, exactly one per call: an inline
  // directive on --text, or a --file path that must be a cortex plan/spec doc.
  const hasText = flags.text !== undefined;
  const hasFile = flags.file !== undefined;
  if (hasText && hasFile) {
    return failed(out, ['steer: name --text (inline) or --file (a .cortex doc), not both']);
  }
  if (!hasText && !hasFile) {
    return failed(out, ['steer: name --text (inline) or --file (a .cortex doc)']);
  }

  let text;
  if (hasText) {
    text = flags.text;
  } else {
    const gate = requireCortexDoc(flags.file);
    if (!gate.ok) return failed(out, [`steer: --file: ${gate.reason}`]);
    try {
      text = readFileSync(flags.file, 'utf8');
    } catch (error) {
      return failed(out, [`steer: --file: ${error.message}`]);
    }
  }

  let wakeTimeoutMs;
  if (flags['wake-timeout'] !== undefined) {
    wakeTimeoutMs = Number(flags['wake-timeout']);
    if (!Number.isFinite(wakeTimeoutMs) || wakeTimeoutMs <= 0) {
      return failed(out, ['steer: --wake-timeout must be a positive number of milliseconds']);
    }
  }

  const document = steerAgent({
    agent: flags.agent,
    text,
    expect: flags.expect ?? null,
    ...(wakeTimeoutMs !== undefined ? { wakeTimeoutMs } : {}),
    env: io.env ?? process.env,
    ...(io.options ? { options: io.options } : {}),
  });
  emit(out, document);
  return document.status === 'ok' || document.status === 'skipped' ? 0 : 1;
}

function runStatus(args, io) {
  const { out } = io;
  const parsed = parseFlags(args, ['dispatch-id', 'agents', 'shared-checkout']);
  if (parsed.help) { out.write(USAGE); return 0; }
  if (parsed.error) return failed(out, [parsed.error]);
  const flags = parsed.value;
  if (flags['dispatch-id'] && flags.agents) {
    return failed(out, ['status: name either --dispatch-id or --agents, not both']);
  }

  const document = readStatus({
    dispatchId: flags['dispatch-id'] ?? null,
    names: flags.agents ? flags.agents.split(',').map((name) => name.trim()).filter(Boolean) : null,
    sharedCheckout: flags['shared-checkout'] ?? null,
    env: process.env,
  });
  emit(out, document);
  return document.classification === 'UNREADABLE' ? 1 : 0;
}

export async function main(argv, io = {}) {
  const resolved = {
    out: io.out ?? process.stdout,
    err: io.err ?? process.stderr,
    stdin: io.stdin ?? process.stdin,
    fetchRoster: io.fetchRoster,
    options: io.options,
    env: io.env,
  };
  const [verb, ...rest] = argv;

  if (verb === undefined || verb === '--help' || verb === '-h' || verb === 'help') {
    resolved.out.write(USAGE);
    return verb === undefined ? 1 : 0;
  }

  // Last resort: whatever went wrong, the caller gets a JSON document on stdout
  // and a non-zero exit, never a stack trace where a result was promised.
  try {
    switch (verb) {
      case 'dispatch':
        return await runDispatch(rest, resolved);
      case 'steer':
        return runSteer(rest, resolved);
      case 'status':
        return runStatus(rest, resolved);
      default:
        resolved.err.write(`${verb}: unknown verb\n\n${USAGE}`);
        return 1;
    }
  } catch (error) {
    const detail = error?.herdrError ? JSON.stringify(error.toJSON()) : `${error.name ?? 'Error'}: ${error.message}`;
    resolved.err.write(`${error.stack ?? detail}\n`);
    return failed(resolved.out, [`${verb}: ${detail}`]);
  }
}

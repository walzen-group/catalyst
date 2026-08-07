// Arg parsing, verb routing, JSON in / JSON out. c2m is to memory what c2d is to
// dispatch: the mechanics live in the modules; this file threads argv to them and
// prints a JSON result. curate/summon/housekeeping assemble a dispatch and pipe
// it to c2d, returning c2d's result verbatim.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defaultModelsPath, curatorModel } from './models.mjs';
import { initTree, promote, merge, adopt, decay, prune, resurrect, pin, unpin, reindex } from './store.mjs';
import { note, inboxList, inboxDone } from './inbox.mjs';
import { buildCurateDispatch, buildSummonDispatch, runC2dDispatch } from './dispatch.mjs';
import { buildHousekeepingReport } from './housekeeping.mjs';

const USAGE = `c2m: deterministic memory-store mechanics for The Curator

Usage:
  c2m init --tree <p>
  c2m note "<text>" [--agent <name>] [--tree <p>]
  c2m inbox list --tree <p>
  c2m inbox done <id> --tree <p>
  c2m promote <slug> --desc "<line>" [--from-inbox <id>] --tree <p>   (else content on stdin)
  c2m merge <target-slug> [--from-inbox <id>] --tree <p>   (else content on stdin)
  c2m adopt <slug> [--desc "<line>"] --tree <p>   (row a ledger-less content file)
  c2m decay [--relevant <slug,slug,...>] --tree <p>
  c2m prune --tree <p>
  c2m resurrect <slug> --tree <p>
  c2m pin <slug> --tree <p>
  c2m unpin <slug> --tree <p>
  c2m reindex --tree <p>
  c2m curate --tree <p> [--effort <plandir>] [--dry-run]
  c2m summon --tree <p> [--effort <plandir>] [--dry-run]
  c2m housekeeping --tree <p> [--effort <plandir>] [--always] [--dry-run]

--tree names one .cortex/memory tree, and the value is the memory tree
directory itself, never the project root: the kit tree is
--tree /workspaces/nix/.cortex/memory (not /workspaces/nix). Every store path
lives under it. curate and
summon assemble a curator dispatch (claude, kind curator, the persona style_file,
the curator model from models.yaml) and pipe it to "c2d dispatch", returning c2d's
result verbatim (including the wake the caller must arm). housekeeping runs the
same assembly on its own decision: it counts the inbox and scans the sibling
plans dir for terminal plans, then spawns when the inbox holds notes or --always
is given. The c2d binary is CATALYST_C2D_BIN (default c2d on PATH).

Exit 0 when the verb did what it was asked; 1 on any refusal or failure.
`;

function emit(out, document) {
  out.write(`${JSON.stringify(document, null, 2)}\n`);
}

function failed(out, message) {
  emit(out, { status: 'failed', error: message });
  return 1;
}

/** Pull flags with values plus bare positionals out of an arg list. */
function parse(args, valued) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (!valued.includes(key)) return { error: `${arg}: unknown option` };
      i += 1;
      if (i >= args.length) return { error: `${arg}: needs a value` };
      flags[key] = args[i];
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function requireTree(flags, out) {
  if (!flags.tree || flags.tree.trim() === '') {
    failed(out, 'a --tree <path> is required');
    return null;
  }
  const tree = flags.tree;
  // A --tree value is the memory tree itself. The classic mistake is the
  // project root: it is not a memory tree, but its .cortex/memory subdir is.
  // Refuse with the likely intended path so a wrong call self-corrects
  // instead of reading an empty inbox or writing content to the project root.
  const intended = join(tree, '.cortex', 'memory');
  const isMemoryTree = existsSync(join(tree, '.curator')) || existsSync(join(tree, 'MEMORY.md'));
  const holdsMemoryTree = existsSync(join(intended, '.curator')) || existsSync(join(intended, 'MEMORY.md'));
  if (!isMemoryTree && holdsMemoryTree) {
    failed(out, `--tree names a .cortex/memory tree directly; "${tree}" is not one. Did you mean ${intended}?`);
    return null;
  }
  return tree;
}

async function readStdin(stdin) {
  if (!stdin || stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function ok(out, extra) {
  emit(out, { status: 'ok', ...extra });
  return 0;
}

async function runHousekeeping(rest, io) {
  const { out, env } = io;
  // --dry-run and --always are bare flags; strip them before value parsing.
  const dryRun = rest.includes('--dry-run');
  const always = rest.includes('--always');
  const parsed = parse(rest.filter((arg) => arg !== '--dry-run' && arg !== '--always'), ['tree', 'effort']);
  if (parsed.error) return failed(out, parsed.error);
  const tree = requireTree(parsed.flags, out);
  if (tree === null) return 1;

  const report = buildHousekeepingReport(tree, { always });
  let curator = null;
  if (report.pass_needed && !dryRun) {
    let model;
    try {
      model = curatorModel(defaultModelsPath(env));
    } catch (error) {
      return failed(out, `housekeeping: could not read the curator model: ${error.message}`);
    }
    const doc = buildCurateDispatch(tree, { model, effort: parsed.flags.effort ?? null, now: io.now ?? new Date() });
    const result = runC2dDispatch(doc, { env, spawn: io.spawn });
    if (result.stderr) io.err.write(result.stderr);
    if (result.stdout) curator = JSON.parse(result.stdout);
  }
  emit(out, { ...report, curator });
  return 0;
}

async function runInbox(rest, io) {
  const { out } = io;
  const [sub, ...args] = rest;
  if (sub === 'list') {
    const parsed = parse(args, ['tree']);
    if (parsed.error) return failed(out, parsed.error);
    const tree = requireTree(parsed.flags, out);
    if (tree === null) return 1;
    return ok(out, { notes: inboxList(tree) });
  }
  if (sub === 'done') {
    const parsed = parse(args, ['tree']);
    if (parsed.error) return failed(out, parsed.error);
    const tree = requireTree(parsed.flags, out);
    if (tree === null) return 1;
    const id = parsed.positional[0];
    if (!id) return failed(out, 'inbox done: an <id> is required');
    return ok(out, inboxDone(tree, id));
  }
  return failed(out, `inbox: unknown subcommand "${sub ?? ''}"; use list or done`);
}

async function runCurateLike(build, rest, io, kind) {
  const { out, env } = io;
  // --dry-run is a bare flag passed through to c2d; strip it before value parsing.
  const dryRun = rest.includes('--dry-run');
  const parsed = parse(rest.filter((arg) => arg !== '--dry-run'), ['tree', 'effort']);
  if (parsed.error) return failed(out, parsed.error);
  const tree = requireTree(parsed.flags, out);
  if (tree === null) return 1;

  let model;
  try {
    model = curatorModel(defaultModelsPath(env));
  } catch (error) {
    return failed(out, `${kind}: could not read the curator model: ${error.message}`);
  }

  const doc = build(tree, { model, effort: parsed.flags.effort ?? null, now: io.now ?? new Date() });
  const result = runC2dDispatch(doc, { env, spawn: io.spawn, dryRun });
  if (result.stderr) io.err.write(result.stderr);
  out.write(result.stdout);
  return result.status === 0 ? 0 : 1;
}

const HANDLERS = {
  init: async (rest, io) => {
    const parsed = parse(rest, ['tree']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    return ok(io.out, initTree(tree, { now: io.now ?? new Date() }));
  },
  note: async (rest, io) => {
    const parsed = parse(rest, ['tree', 'agent']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const text = parsed.positional.join(' ');
    if (text.trim() === '') return failed(io.out, 'note: "<text>" is required');
    return ok(io.out, note(tree, text, { agent: parsed.flags.agent, now: io.now ?? new Date() }));
  },
  inbox: runInbox,
  promote: async (rest, io) => {
    const parsed = parse(rest, ['tree', 'desc', 'from-inbox']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const slug = parsed.positional[0];
    if (!slug) return failed(io.out, 'promote: a <slug> is required');
    const content = parsed.flags['from-inbox'] ? undefined : await readStdin(io.stdin);
    return ok(io.out, promote(tree, slug, {
      desc: parsed.flags.desc,
      fromInbox: parsed.flags['from-inbox'],
      content,
      now: io.now ?? new Date(),
    }));
  },
  merge: async (rest, io) => {
    const parsed = parse(rest, ['tree', 'from-inbox']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const slug = parsed.positional[0];
    if (!slug) return failed(io.out, 'merge: a <target-slug> is required');
    const content = parsed.flags['from-inbox'] ? undefined : await readStdin(io.stdin);
    return ok(io.out, merge(tree, slug, {
      fromInbox: parsed.flags['from-inbox'],
      content,
      now: io.now ?? new Date(),
    }));
  },
  adopt: async (rest, io) => {
    const parsed = parse(rest, ['tree', 'desc']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const slug = parsed.positional[0];
    if (!slug) return failed(io.out, 'adopt: a <slug> is required');
    return ok(io.out, adopt(tree, slug, { desc: parsed.flags.desc, now: io.now ?? new Date() }));
  },
  decay: async (rest, io) => {
    const parsed = parse(rest, ['tree', 'relevant']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const relevant = parsed.flags.relevant
      ? parsed.flags.relevant.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    return ok(io.out, decay(tree, { relevant, now: io.now ?? new Date() }));
  },
  prune: async (rest, io) => {
    const parsed = parse(rest, ['tree']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    return ok(io.out, prune(tree));
  },
  resurrect: async (rest, io) => {
    const parsed = parse(rest, ['tree']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const slug = parsed.positional[0];
    if (!slug) return failed(io.out, 'resurrect: a <slug> is required');
    return ok(io.out, resurrect(tree, slug, { now: io.now ?? new Date() }));
  },
  pin: async (rest, io) => {
    const parsed = parse(rest, ['tree']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const slug = parsed.positional[0];
    if (!slug) return failed(io.out, 'pin: a <slug> is required');
    return ok(io.out, pin(tree, slug));
  },
  unpin: async (rest, io) => {
    const parsed = parse(rest, ['tree']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    const slug = parsed.positional[0];
    if (!slug) return failed(io.out, 'unpin: a <slug> is required');
    return ok(io.out, unpin(tree, slug));
  },
  reindex: async (rest, io) => {
    const parsed = parse(rest, ['tree']);
    if (parsed.error) return failed(io.out, parsed.error);
    const tree = requireTree(parsed.flags, io.out);
    if (tree === null) return 1;
    return ok(io.out, reindex(tree));
  },
  curate: (rest, io) => runCurateLike(buildCurateDispatch, rest, io, 'curate'),
  summon: (rest, io) => runCurateLike(buildSummonDispatch, rest, io, 'summon'),
  housekeeping: runHousekeeping,
};

export async function main(argv, io = {}) {
  const resolved = {
    out: io.out ?? process.stdout,
    err: io.err ?? process.stderr,
    stdin: io.stdin ?? process.stdin,
    env: io.env ?? process.env,
    spawn: io.spawn,
    now: io.now,
  };
  const [verb, ...rest] = argv;

  if (verb === undefined || verb === '--help' || verb === '-h' || verb === 'help') {
    resolved.out.write(USAGE);
    return verb === undefined ? 1 : 0;
  }

  const handler = HANDLERS[verb];
  if (!handler) {
    resolved.err.write(`${verb}: unknown verb\n\n${USAGE}`);
    return 1;
  }

  // Last resort: a refusal document on stdout and a non-zero exit, never a stack
  // trace where a result was promised.
  try {
    return await handler(rest, resolved);
  } catch (error) {
    return failed(resolved.out, `${verb}: ${error.message}`);
  }
}

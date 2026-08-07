// The style_file transport: c2d passes the persona file PATH straight through
// to the CLI's own file-reading flag. It never reads or transforms the file
// itself, so no multi-line body ever becomes a shell-encoded CLI argument.
// Behavior contract: .cortex/plans/2026-08-03-the-curator/design.md ("Output-style
// application"), task-11-transport-fix.md.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

import { styleArgs } from '../src/launch.mjs';
import { main } from '../src/cli.mjs';

function personaFile(body) {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-persona-'));
  const p = join(dir, 'the-curator.md');
  writeFileSync(p, body);
  return p;
}

test('styleArgs on a claude agent neutralizes the ambient style and passes the file path', () => {
  const p = personaFile('---\nname: the-curator\n---\nYou are The Curator.');
  assert.deepEqual(styleArgs({ cli: 'claude', style_file: p }), [
    '--settings',
    '{"outputStyle":"Default"}',
    '--append-system-prompt-file',
    p,
  ]);
});

test('styleArgs on an omp agent passes the file path in omp\'s append form', () => {
  const p = personaFile('---\nname: the-curator\n---\nYou are The Curator.');
  assert.deepEqual(styleArgs({ cli: 'omp', style_file: p }), [
    '--append-system-prompt',
    p,
  ]);
});

test('styleArgs never reads the file: a path to a nonexistent file still resolves to args', () => {
  const missing = join(mkdtempSync(join(tmpdir(), 'catalyst-persona-missing-')), 'ghost.md');
  assert.deepEqual(styleArgs({ cli: 'claude', style_file: missing }), [
    '--settings',
    '{"outputStyle":"Default"}',
    '--append-system-prompt-file',
    missing,
  ]);
});

test('styleArgs keeps frontmatter: the path is passed as-is regardless of file contents', () => {
  const p = personaFile('---\nname: the-curator\ndescription: voice\n---\nGovernor of what was.');
  const args = styleArgs({ cli: 'claude', style_file: p });
  assert.equal(args[args.indexOf('--append-system-prompt-file') + 1], p);
});

test('styleArgs returns nothing when the agent carries no style_file', () => {
  assert.deepEqual(styleArgs({ cli: 'claude' }), []);
});

test('styleArgs never emits an argument carrying a newline, for claude or omp', () => {
  const p = personaFile('---\nname: x\n---\nline one\nline two\nline three');
  for (const cli of ['claude', 'omp']) {
    const args = styleArgs({ cli, style_file: p });
    assert.ok(args.every((arg) => !arg.includes('\n')), `${cli}: ${JSON.stringify(args)}`);
  }
});

// --- CLI dry-run: the resolved launch plan carries the style flags ------------

async function dryRun(doc, { env } = {}) {
  let out = '';
  const code = await main(['dispatch', '--dry-run'], {
    out: { write: (c) => { out += c; } },
    err: { write: () => {} },
    stdin: Readable.from([doc]),
    fetchRoster: () => [],
    ...(env ? { env } : {}),
  });
  return { code, out };
}

test('dry-run of a curator with a style_file resolves the file-path style flags into launch_args', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'catalyst-curator-cwd-'));
  const persona = personaFile('---\nname: the-curator\n---\nYou are The Curator.');
  const doc = JSON.stringify({
    dispatch_id: 'curator-dry',
    heartbeat_ms: 60000,
    agents: [
      {
        name: 'the-curator', cwd, cli: 'claude', model: 'opus', kind: 'curator',
        style_file: persona, brief: { mode: 'inline', text: 'curate the store' },
      },
    ],
  });
  const { code, out } = await dryRun(doc);
  assert.equal(code, 0, out);
  const args = JSON.parse(out).agents[0].launch_args;
  assert.ok(args.includes('--settings'), out);
  assert.ok(args.includes('{"outputStyle":"Default"}'), out);
  assert.ok(args.includes('--append-system-prompt-file'), out);
  assert.ok(args.includes(persona), out);
  assert.equal(args.includes('--append-system-prompt'), false, out);
});

test('dry-run of an omp agent with a style_file appends the file path without a settings flag', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'catalyst-omp-cwd-'));
  const persona = personaFile('---\nname: the-curator\n---\nYou are The Curator.');
  const doc = JSON.stringify({
    dispatch_id: 'omp-dry',
    heartbeat_ms: 60000,
    agents: [
      {
        name: 'the-curator', cwd, cli: 'omp', model: 'deepseek', thinking: 'max', kind: 'curator',
        style_file: persona, brief: { mode: 'inline', text: 'curate the store' },
      },
    ],
  });
  const { code, out } = await dryRun(doc);
  assert.equal(code, 0, out);
  const args = JSON.parse(out).agents[0].launch_args;
  assert.equal(args.includes('--settings'), false, out);
  assert.ok(args.includes('--append-system-prompt'), out);
  assert.ok(args.includes(persona), out);
});

test('a second curator is refused by the single-writer preflight, naming the live one', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'catalyst-curator-live-'));
  const rosterFile = join(mkdtempSync(join(tmpdir(), 'catalyst-roster-')), 'roster.json');
  writeFileSync(rosterFile, JSON.stringify([{ name: 'the-curator' }]));
  const doc = JSON.stringify({
    dispatch_id: 'curator-second',
    heartbeat_ms: 60000,
    agents: [
      {
        name: 'the-curator', cwd, cli: 'claude', model: 'opus', kind: 'curator',
        brief: { mode: 'inline', text: 'curate the store' },
      },
    ],
  });
  const prev = process.env.CATALYST_DISPATCH_ROSTER_JSON;
  process.env.CATALYST_DISPATCH_ROSTER_JSON = rosterFile;
  let out = '';
  try {
    const code = await main(['dispatch', '--dry-run'], {
      out: { write: (c) => { out += c; } },
      err: { write: () => {} },
      stdin: Readable.from([doc]),
    });
    assert.equal(code, 1, out);
  } finally {
    if (prev === undefined) delete process.env.CATALYST_DISPATCH_ROSTER_JSON;
    else process.env.CATALYST_DISPATCH_ROSTER_JSON = prev;
  }
  const failures = JSON.parse(out).failures.join(' ');
  assert.match(failures, /a curator is already live \(the-curator\)/);
  assert.match(failures, /single-writer/);
});

// housekeeping: the inbox count, the sibling plans scan, the pass decision,
// and the curator self-spawn. The scan/decision mechanics are proven here; the
// c2d pipe is proven through the same injectable spawn seam curate uses.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { countInboxNotes, scanPlans, buildHousekeepingReport } from '../src/housekeeping.mjs';
import { main } from '../src/cli.mjs';

const MODELS_YAML = new URL('../../catalyst-v2-model-picking/models.yaml', import.meta.url).pathname;

function capture() {
  let text = '';
  return { write: (chunk) => { text += chunk; }, get text() { return text; } };
}

function io(extra = {}) {
  return {
    out: capture(),
    err: capture(),
    stdin: Object.assign(Readable.from([]), { isTTY: true }),
    env: { ...process.env, CATALYST_MODELS_YAML: MODELS_YAML },
    now: new Date('2026-08-04T07:15:00.000Z'),
    ...extra,
  };
}

// A self-contained root so tree/../plans always lands inside the fixture.
function freshRoot() {
  return mkdtempSync(join(tmpdir(), 'c2m-hk-'));
}

function planDir(root, name) {
  const dir = join(root, 'plans', name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

test('inbox count: missing or empty inbox reports 0, notes report N, hidden files ignored', () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(tree, { recursive: true });
  assert.equal(countInboxNotes(tree), 0, 'missing inbox dir counts 0');

  mkdirSync(join(tree, 'inbox'));
  assert.equal(countInboxNotes(tree), 0, 'empty inbox counts 0');

  writeFileSync(join(tree, 'inbox', 'a.md'), 'note a');
  writeFileSync(join(tree, 'inbox', 'b.md'), 'note b');
  writeFileSync(join(tree, 'inbox', '.hidden.md'), 'hidden');
  mkdirSync(join(tree, 'inbox', 'sub'));
  assert.equal(countInboxNotes(tree), 2, 'hidden files and subdirs do not count');
});

test('plan scan: directory plans classify by the first 00-index.md status line', () => {
  const root = freshRoot();
  const plans = join(root, 'plans');

  writeFileSync(join(planDir(root, '2026-08-01-done'), '00-index.md'),
    '> **Status: COMPLETE** (2026-08-04)\n\nbody\n');
  writeFileSync(join(planDir(root, '2026-08-02-active'), '00-index.md'),
    '> **Status: ACTIVE** (2026-08-04)\n\nbody\n');
  writeFileSync(join(planDir(root, '2026-08-03-noindex'), 'notes.md'), 'no index here\n');
  mkdirSync(join(plans, '.hidden-dir'));

  const result = scanPlans(plans);
  assert.deepEqual(result.terminal, [
    { name: '2026-08-01-done', status: 'COMPLETE', line: '> **Status: COMPLETE** (2026-08-04)' },
  ]);
  assert.deepEqual(result.open, [
    { name: '2026-08-02-active', status: 'ACTIVE', line: '> **Status: ACTIVE** (2026-08-04)' },
  ]);
  assert.deepEqual(result.no_status, ['2026-08-03-noindex']);
});

test('plan scan: root-level .md files classify by a **Status:** header', () => {
  const root = freshRoot();
  const plans = join(root, 'plans');
  mkdirSync(plans, { recursive: true });

  writeFileSync(join(plans, 'one-off.md'), '# One off\n\n**Status:** DONE\n');
  writeFileSync(join(plans, 'notes.md'), '# notes\n\nno status header\n');
  writeFileSync(join(plans, '.hidden.md'), '**Status:** DONE\n');

  const result = scanPlans(plans);
  assert.deepEqual(result.terminal, [{ name: 'one-off', status: 'DONE', line: '**Status:** DONE' }]);
  assert.deepEqual(result.open, []);
  assert.deepEqual(result.no_status, ['notes']);
});

test('qualifier rule: COMPLETE - INTEGRATION OPEN reports open, raw line carried', () => {
  const root = freshRoot();
  writeFileSync(join(planDir(root, '2026-08-04-qualified'), '00-index.md'),
    '> **Status: COMPLETE - INTEGRATION OPEN**\n\nbody\n');

  const result = scanPlans(join(root, 'plans'));
  assert.deepEqual(result.terminal, []);
  assert.deepEqual(result.open, [{
    name: '2026-08-04-qualified',
    status: 'COMPLETE',
    line: '> **Status: COMPLETE - INTEGRATION OPEN**',
  }]);
});

test('a missing plans dir scans to empty lists', () => {
  const root = freshRoot();
  const result = scanPlans(join(root, 'plans'));
  assert.deepEqual(result, { terminal: [], open: [], no_status: [] });
});

test('decision: notes present force a pass, empty inbox needs --always', () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(tree, { recursive: true });
  assert.equal(buildHousekeepingReport(tree).pass_needed, false, 'empty inbox, no flags');

  mkdirSync(join(tree, 'inbox'));
  writeFileSync(join(tree, 'inbox', 'a.md'), 'note');
  assert.equal(buildHousekeepingReport(tree).pass_needed, true, 'notes present');

  const empty = freshRoot();
  mkdirSync(join(empty, 'memory'), { recursive: true });
  assert.equal(buildHousekeepingReport(join(empty, 'memory'), { always: true }).pass_needed, true, '--always forces');
});

test('housekeeping spawns the curator through the same pipe as curate when a pass is owed', async () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(join(tree, 'inbox'), { recursive: true });
  writeFileSync(join(tree, 'inbox', 'a.md'), 'note');
  const effort = join(root, 'plans', '2026-08-04-x');
  mkdirSync(effort, { recursive: true });

  let piped;
  const spawn = (bin, args, opts) => {
    piped = JSON.parse(opts.input);
    return { status: 0, stdout: '{"status":"ok","from":"c2d"}\n', stderr: '' };
  };
  const o = io({ spawn });
  const code = await main(['housekeeping', '--tree', tree, '--effort', effort], o);
  assert.equal(code, 0);

  const doc = JSON.parse(o.out.text);
  assert.equal(doc.inbox_notes, 1);
  assert.equal(doc.pass_needed, true);
  assert.deepEqual(doc.curator, { status: 'ok', from: 'c2d' }, 'c2d result embedded verbatim');

  assert.ok(piped, 'the dispatch went through the c2d pipe');
  assert.equal(piped.agents[0].name, 'the-curator');
  assert.equal(piped.agents[0].kind, 'curator');
  assert.match(piped.agents[0].style_file, /the-curator\.md$/);
  assert.equal(piped.agents[0].model, 'sonnet', 'curator model from the models fixture');
  assert.match(piped.agents[0].brief.text, /2026-08-04-x/, 'the --effort plan dir is threaded');
});

test('housekeeping --dry-run spawns nothing and reports curator null', async () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(join(tree, 'inbox'), { recursive: true });
  writeFileSync(join(tree, 'inbox', 'a.md'), 'note');

  let calls = 0;
  const spawn = () => { calls += 1; return { status: 0, stdout: '{}', stderr: '' }; };
  const o = io({ spawn });
  const code = await main(['housekeeping', '--tree', tree, '--dry-run'], o);
  assert.equal(code, 0);
  assert.equal(calls, 0, 'dry run never spawns');

  const doc = JSON.parse(o.out.text);
  assert.equal(doc.pass_needed, true);
  assert.equal(doc.curator, null);
});

test('housekeeping --always --dry-run forces pass_needed true with curator still null', async () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(tree, { recursive: true });

  const o = io();
  const code = await main(['housekeeping', '--tree', tree, '--always', '--dry-run'], o);
  assert.equal(code, 0);

  const doc = JSON.parse(o.out.text);
  assert.equal(doc.pass_needed, true);
  assert.equal(doc.curator, null);
});

test('housekeeping with an empty inbox and no --always spawns nothing', async () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(tree, { recursive: true });

  let calls = 0;
  const spawn = () => { calls += 1; return { status: 0, stdout: '{}', stderr: '' }; };
  const o = io({ spawn });
  const code = await main(['housekeeping', '--tree', tree], o);
  assert.equal(code, 0);
  assert.equal(calls, 0);

  const doc = JSON.parse(o.out.text);
  assert.equal(doc.pass_needed, false);
  assert.equal(doc.curator, null);
});

test('a c2d refusal surfaces inside the curator field', async () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(join(tree, 'inbox'), { recursive: true });
  writeFileSync(join(tree, 'inbox', 'a.md'), 'note');

  const spawn = () => ({ status: 1, stdout: '{"status":"failed","error":"a curator is already live"}\n', stderr: '' });
  const o = io({ spawn });
  const code = await main(['housekeeping', '--tree', tree], o);
  assert.equal(code, 0, 'the report is still the deliverable');

  const doc = JSON.parse(o.out.text);
  assert.equal(doc.curator.status, 'failed');
  assert.match(doc.curator.error, /already live/);
});

test('housekeeping prints one JSON document with the contract keys and exits 0', async () => {
  const root = freshRoot();
  const tree = join(root, 'memory');
  mkdirSync(tree, { recursive: true });

  const o = io();
  const code = await main(['housekeeping', '--tree', tree], o);
  assert.equal(code, 0);

  const doc = JSON.parse(o.out.text);
  assert.deepEqual(Object.keys(doc).sort(), ['curator', 'inbox_notes', 'pass_needed', 'plans', 'tree']);
  assert.equal(doc.tree, tree);
  assert.equal(doc.inbox_notes, 0);
  assert.equal(doc.pass_needed, false);
  assert.deepEqual(Object.keys(doc.plans).sort(), ['no_status', 'open', 'terminal']);
  assert.equal(doc.curator, null);
});

test('housekeeping without --tree is refused', async () => {
  const o = io();
  const code = await main(['housekeeping'], o);
  assert.equal(code, 1);
  assert.match(o.out.text, /tree/);
});

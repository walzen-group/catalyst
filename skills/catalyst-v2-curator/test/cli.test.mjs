// The CLI: arg parsing, verb routing, JSON out. The store mechanics are proven in
// store.test.mjs; here we prove the seam from argv to those verbs, and that
// curate hands off to c2d and returns its result verbatim.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

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

function freshTree() {
  const tree = mkdtempSync(join(tmpdir(), 'c2m-cli-'));
  writeFileSync(join(tree, 'feedback-alpha.md'), '# Alpha\n\nbody\n');
  return tree;
}

test('init scaffolds the tree and exits 0', async () => {
  const tree = freshTree();
  const o = io();
  const code = await main(['init', '--tree', tree], o);
  assert.equal(code, 0);
  assert.ok(existsSync(join(tree, '.curator', 'ledger.json')));
  assert.match(o.out.text, /"status": "ok"/);
});

test('note writes one inbox file and reports its id', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  const o = io();
  const code = await main(['note', 'a fresh observation', '--tree', tree, '--agent', 'meta-x'], o);
  assert.equal(code, 0);
  const files = readdirSync(join(tree, 'inbox'));
  assert.equal(files.length, 1);
  assert.match(o.out.text, /meta-x/);
});

test('inbox list reports pending notes', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  await main(['note', 'note one', '--tree', tree, '--agent', 'a'], io());
  const o = io();
  const code = await main(['inbox', 'list', '--tree', tree], o);
  assert.equal(code, 0);
  assert.match(o.out.text, /note one|"notes"/);
});

test('note with --source round-trips through the frontmatter and inbox list', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  const source = 'plan:.cortex/plans/2026-08-05-demo-effort';
  const o = io();
  const code = await main(['note', 'the local cache is SQLite', '--tree', tree, '--source', source], o);
  assert.equal(code, 0);
  const files = readdirSync(join(tree, 'inbox'));
  assert.equal(files.length, 1);
  const content = readFileSync(join(tree, 'inbox', files[0]), 'utf8');
  assert.match(content, /^source: plan:\.cortex\/plans\/2026-08-05-demo-effort$/m, 'source: line in the frontmatter');
  const o2 = io();
  assert.equal(await main(['inbox', 'list', '--tree', tree], o2), 0);
  const parsed = JSON.parse(o2.out.text);
  assert.equal(parsed.notes[0].source, source, 'inbox list surfaces the provenance');
});

test('note without --source writes no source line and lists null provenance', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  const o = io();
  assert.equal(await main(['note', 'plain observation', '--tree', tree], o), 0);
  const files = readdirSync(join(tree, 'inbox'));
  assert.equal(files.length, 1);
  const content = readFileSync(join(tree, 'inbox', files[0]), 'utf8');
  assert.ok(!/^source:/.test(content), 'no source: line written when --source is omitted');
  const o2 = io();
  assert.equal(await main(['inbox', 'list', '--tree', tree], o2), 0);
  const parsed = JSON.parse(o2.out.text);
  assert.equal(parsed.notes[0].source, null);
});

test('adopt rows a ledger-less content file and reports its slug', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  writeFileSync(join(tree, 'reference-gamma.md'), '# Gamma\n\nbody\n');
  const o = io();
  const code = await main(['adopt', 'reference-gamma', '--tree', tree], o);
  assert.equal(code, 0);
  assert.match(o.out.text, /"slug": "reference-gamma"/);
  const ledger = JSON.parse(readFileSync(join(tree, '.curator', 'ledger.json'), 'utf8'));
  assert.ok('reference-gamma' in ledger.entries, 'the ledger gained the row');
  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /reference-gamma\.md/, 'the index gained the line');
});

test('adopt refuses a slug that already has a row', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  const o = io();
  const code = await main(['adopt', 'feedback-alpha', '--tree', tree], o);
  assert.equal(code, 1);
  assert.match(o.out.text, /already has a ledger row/);
});

test('an unknown verb exits 1', async () => {
  const code = await main(['frobnicate'], io());
  assert.equal(code, 1);
});

test('a missing --tree is refused', async () => {
  const o = io();
  const code = await main(['init'], o);
  assert.equal(code, 1);
  assert.match(o.out.text, /tree/);
});

test('a project-root --tree holding a .cortex/memory tree is refused with the intended path', async () => {
  const project = freshTree(); // the project root, not a memory tree
  await main(['init', '--tree', join(project, '.cortex', 'memory')], io());
  for (const argv of [
    ['note', 'a late observation', '--tree', project],
    ['inbox', 'list', '--tree', project],
    ['init', '--tree', project],
    ['housekeeping', '--tree', project],
  ]) {
    const o = io();
    const code = await main(argv, o);
    assert.equal(code, 1, `${argv.join(' ')} refused`);
    assert.match(o.out.text, /\.cortex\/memory/, 'the refusal names the intended path');
    assert.match(o.out.text, /Did you mean/, 'the refusal is self-correcting');
  }
  // Nothing was scaffolded at the project root by the refused calls.
  assert.ok(!existsSync(join(project, '.curator')), 'no .curator at the project root');
  assert.ok(!existsSync(join(project, 'MEMORY.md')), 'no MEMORY.md at the project root');
});

test('a valid memory tree and a fresh init path are not refused', async () => {
  // A real tree keeps working.
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  const o = io();
  assert.equal(await main(['inbox', 'list', '--tree', tree], o), 0);
  // A fresh dir with no .cortex/memory inside still inits.
  const fresh = freshTree();
  const o2 = io();
  assert.equal(await main(['init', '--tree', fresh], o2), 0);
  assert.ok(existsSync(join(fresh, '.curator', 'ledger.json')));
});

test('curate hands off to c2d and returns its result verbatim', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());

  const calls = [];
  const spawn = (bin, args, opts) => {
    calls.push({ bin, args, input: opts.input });
    return { status: 0, stdout: '{"status":"ok","from":"c2d"}\n', stderr: '' };
  };
  const o = io({ spawn });
  const code = await main(['curate', '--tree', tree], o);
  assert.equal(code, 0);
  assert.equal(o.out.text, '{"status":"ok","from":"c2d"}\n', 'c2d stdout passed through verbatim');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['dispatch']);
  const piped = JSON.parse(calls[0].input);
  assert.equal(piped.agents[0].name, 'the-curator');
  assert.equal(piped.agents[0].model, 'sonnet');
  assert.equal(piped.agents[0].kind, 'curator');
});

test('curate mirrors a non-zero c2d exit', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  const spawn = () => ({ status: 1, stdout: '{"status":"failed"}\n', stderr: '' });
  const o = io({ spawn });
  const code = await main(['curate', '--tree', tree], o);
  assert.equal(code, 1);
});

test('summon assembles a focused dispatch and hands it to c2d', async () => {
  const tree = freshTree();
  await main(['init', '--tree', tree], io());
  let piped;
  const spawn = (bin, args, opts) => {
    piped = JSON.parse(opts.input);
    return { status: 0, stdout: '{}\n', stderr: '' };
  };
  await main(['summon', '--tree', tree], io({ spawn }));
  assert.equal(piped.agents[0].focus, true);
  assert.equal(piped.agents[0].user_triggered, true);
});

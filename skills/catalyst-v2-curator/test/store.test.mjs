// The store verbs over a scratch memory tree. Each verb owns one mechanic: the
// ledger holds strength/pin, content files stay pure prose, MEMORY.md is the
// human index. A fixed clock makes stamps deterministic.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { treePaths } from '../src/paths.mjs';
import { readLedger } from '../src/ledger.mjs';
import { initTree } from '../src/store.mjs';
import { note, inboxList, inboxDone } from '../src/inbox.mjs';
import { promote, merge, adopt, decay, prune, resurrect, pin, unpin, reindex } from '../src/store.mjs';

const CLOCK = new Date('2026-08-04T07:15:00.000Z');

function freshTree() {
  const dir = mkdtempSync(join(tmpdir(), 'c2m-tree-'));
  return dir;
}

// A tree with two content files and a matching index, no store scaffold yet.
function seededTree() {
  const tree = freshTree();
  writeFileSync(join(tree, 'feedback-alpha.md'), '# Alpha\n\nAlpha body.\n');
  writeFileSync(join(tree, 'project-beta.md'), '# Beta\n\nBeta body.\n');
  writeFileSync(
    join(tree, 'MEMORY.md'),
    '# MEMORY.md\n\n- feedback-alpha.md - the alpha note\n- project-beta.md - the beta note\n',
  );
  return tree;
}

test('init creates scaffold, seeds the ledger from existing files, and is idempotent', () => {
  const tree = seededTree();
  const paths = treePaths(tree);

  const first = initTree(tree, { now: CLOCK });
  assert.ok(existsSync(paths.inbox), 'inbox/ exists');
  assert.ok(existsSync(paths.tombstones), '.tombstones/ exists');
  assert.ok(existsSync(paths.ledger), 'ledger.json exists');

  const ledger = readLedger(tree);
  assert.deepEqual(Object.keys(ledger.entries).sort(), ['feedback-alpha', 'project-beta']);
  assert.equal(ledger.entries['feedback-alpha'].strength, 3);
  assert.equal(ledger.entries['feedback-alpha'].pin, false);
  assert.equal(ledger.entries['feedback-alpha'].created, CLOCK.toISOString());
  assert.equal(ledger.entries['feedback-alpha'].last_relevant, CLOCK.toISOString());
  assert.ok(first.seeded.includes('feedback-alpha'));

  // Idempotent: a second init at a later clock leaves the ledger unchanged.
  const before = readFileSync(paths.ledger, 'utf8');
  initTree(tree, { now: new Date('2026-09-01T00:00:00.000Z') });
  assert.equal(readFileSync(paths.ledger, 'utf8'), before, 'second init does not rewrite the ledger');
});

test('note writes one attributed, timestamped inbox file', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });

  const result = note(tree, 'The orchestrator forgot to name itself', { agent: 'meta-probe', now: CLOCK });
  assert.ok(existsSync(result.path), 'the note file exists');
  assert.match(result.id, /meta-probe/, 'id carries the agent');
  assert.equal(result.agent, 'meta-probe');

  const listed = inboxList(tree);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, result.id);
  assert.equal(listed[0].agent, 'meta-probe');
  assert.equal(listed[0].ts, CLOCK.toISOString());
  assert.match(listed[0].preview, /orchestrator forgot/);
});

test('note defaults the agent when none is given', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const result = note(tree, 'a bare observation', { now: CLOCK });
  assert.equal(result.agent, 'unknown');
});

test('note is collision-safe: two notes with the same agent, text, and instant both land', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const a = note(tree, 'same text twice', { agent: 'dup', now: CLOCK });
  const b = note(tree, 'same text twice', { agent: 'dup', now: CLOCK });
  assert.notEqual(a.id, b.id, 'the second note gets a distinct id');
  assert.notEqual(a.path, b.path, 'the second note gets a distinct file');
  assert.ok(existsSync(a.path), 'the first file exists');
  assert.ok(existsSync(b.path), 'the second file exists');
  assert.equal(inboxList(tree).length, 2, 'both notes are present, neither overwrote the other');
});

test('inbox done deletes one processed note', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const a = note(tree, 'first note', { agent: 'x', now: CLOCK });
  const b = note(tree, 'second note', { agent: 'y', now: new Date('2026-08-04T07:16:00.000Z') });
  assert.equal(inboxList(tree).length, 2);
  inboxDone(tree, a.id);
  const rest = inboxList(tree);
  assert.equal(rest.length, 1);
  assert.equal(rest[0].id, b.id);
  assert.throws(() => inboxDone(tree, 'no-such-id'), /not found|does not exist/i);
});

test('promote writes the content file, a ledger row at 3, and an index line', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const out = promote(tree, 'feedback-single-writer', {
    desc: 'a curator is single-writer',
    content: '# Single writer\n\nOnly one curator mutates a store.\n',
    now: CLOCK,
  });
  assert.equal(out.slug, 'feedback-single-writer');
  assert.ok(existsSync(join(tree, 'feedback-single-writer.md')));

  const ledger = readLedger(tree);
  assert.equal(ledger.entries['feedback-single-writer'].strength, 3);

  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /- feedback-single-writer\.md - a curator is single-writer/);
});

test('promote sources content from an inbox note body when asked', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const n = note(tree, 'raw candidate text', { agent: 'z', now: CLOCK });
  const out = promote(tree, 'feedback-from-inbox', {
    desc: 'promoted from inbox',
    fromInbox: n.id,
    now: CLOCK,
  });
  const body = readFileSync(join(tree, `${out.slug}.md`), 'utf8');
  assert.match(body, /raw candidate text/);
  // promote does not delete the inbox note; inbox done is a separate step.
  assert.equal(inboxList(tree).length, 1);
});

test('merge integrates content into an existing entry and resets its strength to 3', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  pin(tree, 'project-beta');
  // Drop alpha to 2 before merging, so the reset to 3 is a real change.
  decay(tree, { now: CLOCK });
  assert.equal(readLedger(tree).entries['feedback-alpha'].strength, 2);

  const mergedAt = new Date('2026-08-06T00:00:00.000Z');
  const out = merge(tree, 'feedback-alpha', { content: 'A new fact about alpha.', now: mergedAt });
  assert.equal(out.slug, 'feedback-alpha');
  assert.equal(out.strength, 3);

  const body = readFileSync(join(tree, 'feedback-alpha.md'), 'utf8');
  assert.match(body, /Alpha body\./, 'original content survives');
  assert.match(body, /A new fact about alpha\./, 'new content is integrated');

  const ledger = readLedger(tree);
  assert.equal(ledger.entries['feedback-alpha'].strength, 3);
  assert.equal(ledger.entries['feedback-alpha'].last_relevant, mergedAt.toISOString());
  assert.equal(ledger.entries['project-beta'].strength, 3, 'other entries untouched');
});

test('merge sources content from an inbox note body when asked', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const n = note(tree, 'a fresh fact for alpha', { agent: 'z', now: CLOCK });
  merge(tree, 'feedback-alpha', { fromInbox: n.id, now: CLOCK });
  const body = readFileSync(join(tree, 'feedback-alpha.md'), 'utf8');
  assert.match(body, /a fresh fact for alpha/);
});

test('merge errors on a missing target', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  assert.throws(
    () => merge(tree, 'no-such-slug', { content: 'x', now: CLOCK }),
    /no entry|not found|unknown/i,
  );
});

test('decay decrements non-pinned entries, resets the relevant, and skips pins', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  // alpha starts at 3, beta pinned, add a third entry to reset.
  pin(tree, 'project-beta');
  promote(tree, 'feedback-gamma', { desc: 'gamma', content: '# Gamma\n\ng\n', now: CLOCK });

  const later = new Date('2026-08-05T00:00:00.000Z');
  decay(tree, { relevant: ['feedback-gamma'], now: later });

  const ledger = readLedger(tree);
  assert.equal(ledger.entries['feedback-alpha'].strength, 2, 'alpha decremented 3 -> 2');
  assert.equal(ledger.entries['project-beta'].strength, 3, 'pinned beta untouched');
  assert.equal(ledger.entries['feedback-gamma'].strength, 3, 'relevant gamma reset to 3');
  assert.equal(ledger.entries['feedback-gamma'].last_relevant, later.toISOString());
});

test('decay floors strength at zero', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  // Three decays take alpha from 3 to 0, not below.
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  assert.equal(readLedger(tree).entries['feedback-alpha'].strength, 0);
});

test('promote with no ledger writes nothing and throws', () => {
  const tree = seededTree(); // content files and an index, but no store scaffold
  assert.throws(
    () => promote(tree, 'feedback-gamma', { desc: 'gamma', content: '# Gamma\n\ng\n', now: CLOCK }),
    /ledger not found/i,
  );
  assert.ok(!existsSync(join(tree, 'feedback-gamma.md')), 'no content file written by the failed promote');
  assert.deepEqual(
    readdirSync(tree).sort(),
    ['MEMORY.md', 'feedback-alpha.md', 'project-beta.md'],
    'the tree holds exactly what it held before',
  );
});

test('resurrect with no ledger writes nothing and keeps the tombstone', () => {
  const tree = freshTree();
  const buried = join(tree, '.tombstones');
  mkdirSync(buried, { recursive: true });
  writeFileSync(join(buried, 'feedback-old.md'), '# Old Title\n\nOld body.\n');

  assert.throws(() => resurrect(tree, 'feedback-old', { now: CLOCK }), /ledger not found/i);
  assert.ok(existsSync(join(buried, 'feedback-old.md')), 'tombstone still in place');
  assert.ok(!existsSync(join(tree, 'feedback-old.md')), 'no live file written');
});

test('adopt gives a ledger-less content file a row and an index line, content untouched', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  // A hand-written file, outside the c2m verbs: content present, no ledger row.
  writeFileSync(join(tree, 'feedback-gamma.md'), '# Gamma\n\nGamma body.\n');

  const out = adopt(tree, 'feedback-gamma', { now: CLOCK });
  assert.equal(out.slug, 'feedback-gamma');
  assert.equal(out.strength, 3);

  const ledger = readLedger(tree);
  assert.equal(ledger.entries['feedback-gamma'].strength, 3);
  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /- feedback-gamma\.md - Gamma/, 'index line from the H1 title');
  assert.equal(
    readFileSync(join(tree, 'feedback-gamma.md'), 'utf8'),
    '# Gamma\n\nGamma body.\n',
    'content file untouched',
  );
});

test('adopt preserves an existing index line, honors --desc, and refuses bad inputs', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  writeFileSync(join(tree, 'feedback-gamma.md'), '# Gamma\n\nGamma body.\n');
  writeFileSync(join(tree, 'MEMORY.md'), `${readFileSync(join(tree, 'MEMORY.md'), 'utf8')}- feedback-gamma.md - the hand-written line\n`);

  // An existing index line is preserved over --desc and the H1 title.
  adopt(tree, 'feedback-gamma', { desc: 'a fresh desc', now: CLOCK });
  let index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /- feedback-gamma\.md - the hand-written line/);
  assert.ok(!/a fresh desc/.test(index), 'existing line wins over --desc');

  // A fresh ledger-less file with no index line takes --desc.
  writeFileSync(join(tree, 'reference-delta.md'), '# Delta Title\n\nDelta body.\n');
  adopt(tree, 'reference-delta', { desc: 'the curated line', now: CLOCK });
  index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /- reference-delta\.md - the curated line/);

  // A missing file and an existing row are both refused, and the refusals wrote nothing.
  assert.throws(() => adopt(tree, 'no-such', { now: CLOCK }), /no content file/i);
  assert.throws(() => adopt(tree, 'feedback-alpha', { now: CLOCK }), /already has a ledger row/i);
  assert.deepEqual(
    Object.keys(readLedger(tree).entries).sort(),
    ['feedback-alpha', 'feedback-gamma', 'project-beta', 'reference-delta'],
  );
});

test('prune moves strength-0 files to tombstones and updates ledger and index', () => {
  const tree = seededTree();
  const paths = treePaths(tree);
  initTree(tree, { now: CLOCK });
  // Drive alpha to 0, keep beta alive.
  pin(tree, 'project-beta');
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });

  const out = prune(tree);
  assert.deepEqual(out.pruned, ['feedback-alpha']);
  assert.ok(!existsSync(join(tree, 'feedback-alpha.md')), 'live file gone');
  assert.ok(existsSync(join(paths.tombstones, 'feedback-alpha.md')), 'content preserved in tombstones');

  const ledger = readLedger(tree);
  assert.ok(!('feedback-alpha' in ledger.entries), 'ledger row removed');
  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.ok(!/feedback-alpha\.md/.test(index), 'index line removed');
});

test('resurrect restores a tombstoned entry to the live store', () => {
  const tree = seededTree();
  const paths = treePaths(tree);
  initTree(tree, { now: CLOCK });
  pin(tree, 'project-beta');
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  prune(tree);

  const out = resurrect(tree, 'feedback-alpha', { now: CLOCK });
  assert.equal(out.slug, 'feedback-alpha');
  assert.ok(existsSync(join(tree, 'feedback-alpha.md')), 'file back in the live store');
  assert.ok(!existsSync(join(paths.tombstones, 'feedback-alpha.md')), 'gone from tombstones');
  const ledger = readLedger(tree);
  assert.equal(ledger.entries['feedback-alpha'].strength, 3);
  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /feedback-alpha\.md/);
});

test('prune stashes the curated description and resurrect restores it verbatim', () => {
  const tree = seededTree();
  const paths = treePaths(tree);
  initTree(tree, { now: CLOCK });
  pin(tree, 'feedback-alpha');
  pin(tree, 'project-beta');
  promote(tree, 'feedback-gamma', {
    desc: 'a very particular curated phrase, not the title',
    content: '# Gamma Title\n\ng\n',
    now: CLOCK,
  });
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });
  decay(tree, { now: CLOCK });

  prune(tree);
  assert.ok(existsSync(join(paths.tombstones, 'feedback-gamma.md')));

  resurrect(tree, 'feedback-gamma', { now: CLOCK });

  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(
    index,
    /- feedback-gamma\.md - a very particular curated phrase, not the title/,
    'restored line is the stashed description, verbatim',
  );
  assert.ok(!/Gamma Title/.test(index), 'not regenerated from the H1 title');

  const body = readFileSync(join(tree, 'feedback-gamma.md'), 'utf8');
  assert.ok(!/curator_description/.test(body), 'live content file carries no curator frontmatter');
});

test('resurrect falls back to the H1 title when a tombstone carries no stashed description', () => {
  const tree = seededTree();
  const paths = treePaths(tree);
  initTree(tree, { now: CLOCK });
  // An old-style tombstone, written before prune stashed descriptions: plain content, no frontmatter.
  writeFileSync(join(paths.tombstones, 'feedback-old.md'), '# Old Title\n\nOld body.\n');

  const out = resurrect(tree, 'feedback-old', { now: CLOCK });
  assert.equal(out.slug, 'feedback-old');

  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /- feedback-old\.md - Old Title/, 'falls back to the H1 title');

  const body = readFileSync(join(tree, 'feedback-old.md'), 'utf8');
  assert.ok(!/curator_description/.test(body), 'live content file carries no curator frontmatter');
});

test('pin and unpin flip the ledger flag only', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  pin(tree, 'feedback-alpha');
  assert.equal(readLedger(tree).entries['feedback-alpha'].pin, true);
  unpin(tree, 'feedback-alpha');
  assert.equal(readLedger(tree).entries['feedback-alpha'].pin, false);
  assert.throws(() => pin(tree, 'no-such-slug'), /not in the ledger|unknown/i);
});

test('reindex changes nothing when membership and descriptions already match', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  const before = readFileSync(join(tree, 'MEMORY.md'), 'utf8');

  const out = reindex(tree);

  assert.equal(readFileSync(join(tree, 'MEMORY.md'), 'utf8'), before, 'curated descriptions are untouched');
  assert.deepEqual(out.added, []);
  assert.deepEqual(out.removed, []);
});

test('reindex reconciles membership and preserves existing descriptions', () => {
  const tree = seededTree();
  initTree(tree, { now: CLOCK });
  // Add a file with no index line; remove a file that still has one.
  writeFileSync(join(tree, 'reference-delta.md'), '# Delta pointer\n\nd\n');
  // Simulate a stale line by deleting beta's content file.
  unlinkSync(join(tree, 'project-beta.md'));

  const out = reindex(tree);
  const index = readFileSync(join(tree, 'MEMORY.md'), 'utf8');
  assert.match(index, /- feedback-alpha\.md - the alpha note/, 'existing description preserved');
  assert.match(index, /- reference-delta\.md - Delta pointer/, 'new file gets a line from its title');
  assert.ok(!/project-beta\.md/.test(index), 'absent file line removed');
  assert.ok(out.added.includes('reference-delta.md'));
  assert.ok(out.removed.includes('project-beta.md'));
});

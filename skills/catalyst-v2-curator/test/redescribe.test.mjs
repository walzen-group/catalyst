// redescribe: refresh a live entry's MEMORY.md index line from its content
// file's frontmatter description. Guards the c2m index-line gap (incident
// 2026-08-11-c2m-index-line-gap): promote only creates, adopt refuses an
// existing row, reindex preserves the existing line — none refreshes a live
// entry's index line, so a bare or stale line that ignores the entry's
// frontmatter description has no verb to fix it. redescribe is that verb.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initTree, redescribe } from '../src/store.mjs';
import { readIndex } from '../src/index.mjs';

const CLOCK = new Date('2026-08-11T00:00:00.000Z');

// A live entry: a content file with a frontmatter description, a ledger row
// (seeded by init from the file present at init time), and a bare MEMORY.md
// index line that ignores the description.
function liveTree() {
  const tree = mkdtempSync(join(tmpdir(), 'c2m-redesc-'));
  writeFileSync(
    join(tree, 'project-gamestate-payload-versioning.md'),
    '---\nname: project-gamestate-payload-versioning\ndescription: PR #36 leaves data_version drift open; a parity-infra-gap follow-up tracks it\nmetadata:\n  type: project\n---\n\n# Gamestate payload versioning\n\nBody.\n',
  );
  writeFileSync(
    join(tree, 'MEMORY.md'),
    '# MEMORY.md\n\n- project-gamestate-payload-versioning.md - project-gamestate-payload-versioning\n',
  );
  initTree(tree, { now: CLOCK });
  return tree;
}

test('redescribe refreshes a live entry index line from its frontmatter description', () => {
  const tree = liveTree();
  const slug = 'project-gamestate-payload-versioning';
  const before = readIndex(tree).get(`${slug}.md`);
  assert.equal(before, slug, 'precondition: the index line is the bare slug');

  const result = redescribe(tree, slug, {});

  const after = readIndex(tree).get(`${slug}.md`);
  assert.equal(
    after,
    'PR #36 leaves data_version drift open; a parity-infra-gap follow-up tracks it',
    'the index line now carries the frontmatter description',
  );
  assert.equal(result.slug, slug);
  assert.equal(result.desc, after);
});

test('redescribe honours an explicit --desc override over the frontmatter', () => {
  const tree = liveTree();
  const slug = 'project-gamestate-payload-versioning';
  const result = redescribe(tree, slug, { desc: 'a hand-given override line' });
  assert.equal(readIndex(tree).get(`${slug}.md`), 'a hand-given override line');
  assert.equal(result.desc, 'a hand-given override line');
});

test('redescribe refuses a slug with no ledger row (adopt is the row verb)', () => {
  const tree = liveTree();
  writeFileSync(join(tree, 'orphan.md'), '---\ndescription: an orphan\n---\n\n# Orphan\n');
  assert.throws(() => redescribe(tree, 'orphan', {}), /no ledger row|adopt/);
});

test('redescribe refuses an entry whose content file has no frontmatter description', () => {
  const tree = mkdtempSync(join(tmpdir(), 'c2m-redesc-nd-'));
  writeFileSync(join(tree, 'feedback-x.md'), '# X\n\nNo frontmatter here.\n');
  writeFileSync(join(tree, 'MEMORY.md'), '# MEMORY.md\n\n- feedback-x.md - feedback-x\n');
  initTree(tree, { now: CLOCK });
  assert.throws(() => redescribe(tree, 'feedback-x', {}), /no frontmatter description/);
});

test('redescribe refuses a missing content file', () => {
  const tree = liveTree();
  assert.throws(() => redescribe(tree, 'does-not-exist', {}), /no content file/);
});

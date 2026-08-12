// The durable-store verbs. Each moves the ledger, the content files, and the
// index together so they never drift. Content files stay pure prose; the ledger
// carries strength and pin; MEMORY.md carries the human index. prune and
// resurrect move files, never deleting content.

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { treePaths } from './paths.mjs';
import { readLedger, writeLedger, newRow, FULL_STRENGTH } from './ledger.mjs';
import { readIndex, writeIndex, upsertIndexLine, removeIndexLine } from './index.mjs';
import { readInboxBody } from './inbox.mjs';
import { titleOf, stampIso, splitFrontmatter } from './text.mjs';

/** Key under which prune stashes the live description in a tombstone's frontmatter. */
const DESCRIPTION_KEY = 'curator_description';

/** Content-file slugs live in the tree root: every *.md except the index. */
function contentSlugs(root) {
  return readdirSync(root)
    .filter((name) => name.endsWith('.md') && name !== 'MEMORY.md')
    .map((name) => name.replace(/\.md$/, ''))
    .sort();
}

/**
 * Create the store scaffold (inbox/, .curator/ledger.json, .tombstones/) when
 * absent, and seed the ledger from existing content files. Idempotent: a present
 * ledger is left untouched, so a second run changes nothing.
 */
export function initTree(tree, { now = new Date() } = {}) {
  const paths = treePaths(tree);
  const created = [];
  for (const dir of [paths.inbox, paths.curatorDir, paths.tombstones]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
  }
  let seeded = [];
  if (!existsSync(paths.ledger)) {
    const entries = {};
    for (const slug of contentSlugs(paths.root)) entries[slug] = newRow(now);
    writeLedger(tree, { version: 1, entries });
    seeded = Object.keys(entries);
  }
  return { created, seeded };
}

/**
 * Add a keeper: write its content file, a ledger row at full strength, and its
 * index line. Content comes from --from-inbox (a note body) or the passed string.
 */
export function promote(tree, slug, { desc, content, fromInbox, now = new Date() } = {}) {
  const paths = treePaths(tree);
  if (!slug || slug.trim() === '') throw new Error('promote: a slug is required');
  if (!desc || desc.trim() === '') throw new Error('promote: --desc is required');
  let body = content;
  if (fromInbox) body = readInboxBody(tree, fromInbox);
  if (body == null || String(body).trim() === '') {
    throw new Error('promote: content is required (from --from-inbox or stdin)');
  }
  const file = `${slug}.md`;
  const text = body.endsWith('\n') ? body : `${body}\n`;
  // The ledger read validates the tree before any write: a failed promote
  // (wrong --tree, missing store) must leave nothing behind, or the content
  // file litters whatever path the tree resolved to.
  const ledger = readLedger(tree);
  writeFileSync(join(paths.root, file), text);
  ledger.entries[slug] = newRow(now);
  writeLedger(tree, ledger);

  upsertIndexLine(tree, file, desc.trim());
  return { slug, strength: FULL_STRENGTH };
}

/**
 * Fold new content into an existing entry: append it to the content file and
 * reset the entry's ledger strength to full, same as a fresh promote. The
 * caller supplies the merged text as plain data (--from-inbox or a string),
 * exactly as promote takes content; merge never composes prose itself.
 */
export function merge(tree, slug, { content, fromInbox, now = new Date() } = {}) {
  const paths = treePaths(tree);
  if (!slug || slug.trim() === '') throw new Error('merge: a slug is required');
  const ledger = readLedger(tree);
  if (!Object.prototype.hasOwnProperty.call(ledger.entries, slug)) {
    throw new Error(`merge: no entry "${slug}" in the ledger`);
  }
  let body = content;
  if (fromInbox) body = readInboxBody(tree, fromInbox);
  if (body == null || String(body).trim() === '') {
    throw new Error('merge: content is required (from --from-inbox or stdin)');
  }
  const file = `${slug}.md`;
  const target = join(paths.root, file);
  if (!existsSync(target)) throw new Error(`merge: content file for "${slug}" not found`);

  const existing = readFileSync(target, 'utf8');
  const addition = body.endsWith('\n') ? body : `${body}\n`;
  writeFileSync(target, `${existing.replace(/\n*$/, '\n')}\n${addition}`);

  ledger.entries[slug] = {
    ...ledger.entries[slug],
    strength: FULL_STRENGTH,
    last_relevant: stampIso(now),
  };
  writeLedger(tree, ledger);
  return { slug, strength: FULL_STRENGTH };
}

/**
 * Bring an existing ledger-less content file into the ledger: a row at full
 * strength and an index line, content untouched. The description is the file's
 * existing index line when one exists, else --desc, else the H1 title. Refuses
 * a missing file (promote is the creation verb) and a slug that already has a
 * row (decay and pin are the row verbs). This is the reconciliation verb for
 * store drift: a content file an earlier hand wrote directly, outside the c2m
 * verbs.
 */
export function adopt(tree, slug, { desc, now = new Date() } = {}) {
  const paths = treePaths(tree);
  if (!slug || slug.trim() === '') throw new Error('adopt: a slug is required');
  const file = `${slug}.md`;
  const live = join(paths.root, file);
  if (!existsSync(live)) throw new Error(`adopt: no content file "${file}" in the tree`);
  const ledger = readLedger(tree);
  if (Object.prototype.hasOwnProperty.call(ledger.entries, slug)) {
    throw new Error(`adopt: "${slug}" already has a ledger row`);
  }
  const existing = readIndex(tree).get(file);
  const line = existing
    ?? (desc != null && String(desc).trim() !== '' ? desc.trim() : titleOf(readFileSync(live, 'utf8'), slug));
  ledger.entries[slug] = newRow(now);
  writeLedger(tree, ledger);
  upsertIndexLine(tree, file, line);
  return { slug, strength: FULL_STRENGTH, desc: line };
}

/**
 * Refresh a live entry's MEMORY.md index line from its content file's
 * frontmatter description (or an explicit --desc override). The reconciliation
 * verb for an index line that drifted from the entry's description: promote only
 * creates, adopt refuses an existing row, reindex preserves the existing line,
 * so a live entry's bare or stale index line has no other verb to fix it.
 * Refuses a missing content file (promote is the creation verb), a slug with no
 * ledger row (adopt rows a ledger-less file first), and an entry carrying
 * neither a frontmatter description nor a --desc override. Content and the
 * ledger are untouched; only the index line moves.
 */
export function redescribe(tree, slug, { desc } = {}) {
  const paths = treePaths(tree);
  if (!slug || slug.trim() === '') throw new Error('redescribe: a slug is required');
  const file = `${slug}.md`;
  const live = join(paths.root, file);
  if (!existsSync(live)) throw new Error(`redescribe: no content file "${file}" in the tree`);
  const ledger = readLedger(tree);
  if (!Object.prototype.hasOwnProperty.call(ledger.entries, slug)) {
    throw new Error(`redescribe: "${slug}" has no ledger row; adopt it first`);
  }
  let line;
  if (desc != null && String(desc).trim() !== '') {
    line = desc.trim();
  } else {
    const { meta } = splitFrontmatter(readFileSync(live, 'utf8'));
    line = (meta.description ?? '').trim();
    if (line === '') {
      throw new Error(`redescribe: "${slug}" has no frontmatter description and no --desc given`);
    }
  }
  upsertIndexLine(tree, file, line);
  return { slug, desc: line };
}

/**
 * The decay sweep. Every non-pinned entry drops by one (floored at zero); every
 * slug named relevant resets to full strength with a fresh last_relevant. Pinned
 * entries are never touched.
 */
export function decay(tree, { relevant = [], now = new Date() } = {}) {
  const ledger = readLedger(tree);
  const relevantSet = new Set(relevant);
  const iso = stampIso(now);
  const decayed = [];
  const reset = [];
  const pinnedSkipped = [];
  for (const [slug, row] of Object.entries(ledger.entries)) {
    if (row.pin) {
      pinnedSkipped.push(slug);
      continue;
    }
    if (relevantSet.has(slug)) {
      row.strength = FULL_STRENGTH;
      row.last_relevant = iso;
      reset.push(slug);
    } else {
      row.strength = Math.max(0, row.strength - 1);
      decayed.push(slug);
    }
  }
  writeLedger(tree, ledger);
  return { decayed, reset, pinnedSkipped };
}

/**
 * Move every strength-0, non-pinned entry's file to .tombstones/, and drop its
 * ledger row and index line. Content is moved, never deleted. The entry's live
 * MEMORY.md description is stashed in the tombstoned file's frontmatter, so a
 * later resurrect can restore it verbatim instead of regenerating from the H1.
 */
export function prune(tree) {
  const paths = treePaths(tree);
  const ledger = readLedger(tree);
  const index = readIndex(tree);
  const pruned = [];
  for (const [slug, row] of Object.entries(ledger.entries)) {
    if (row.pin || row.strength > 0) continue;
    const file = `${slug}.md`;
    const live = join(paths.root, file);
    if (existsSync(live)) {
      if (!existsSync(paths.tombstones)) mkdirSync(paths.tombstones, { recursive: true });
      const desc = index.get(file);
      const content = readFileSync(live, 'utf8');
      const tombstoned = desc != null ? `---\n${DESCRIPTION_KEY}: ${desc}\n---\n${content}` : content;
      writeFileSync(join(paths.tombstones, file), tombstoned);
      unlinkSync(live);
    }
    delete ledger.entries[slug];
    removeIndexLine(tree, file);
    pruned.push(slug);
  }
  writeLedger(tree, ledger);
  return { pruned };
}

/**
 * Pull a tombstoned entry back to the live store: strip any stashed curator
 * frontmatter, move its file back, re-add a ledger row at full strength, and
 * re-add its index line. The description is the one prune stashed, restored
 * verbatim; a tombstone with no stash (an older one) falls back to the file's
 * H1 title, as before.
 */
export function resurrect(tree, slug, { now = new Date() } = {}) {
  const paths = treePaths(tree);
  const file = `${slug}.md`;
  const buried = join(paths.tombstones, file);
  if (!existsSync(buried)) throw new Error(`resurrect: no tombstoned entry "${slug}"`);
  const live = join(paths.root, file);
  const { meta, body } = splitFrontmatter(readFileSync(buried, 'utf8'));
  // The ledger read validates the tree before any move: a failed resurrect
  // must leave the tombstone in place and write nothing.
  const ledger = readLedger(tree);
  writeFileSync(live, body);
  unlinkSync(buried);
  ledger.entries[slug] = newRow(now);
  writeLedger(tree, ledger);

  const desc = meta[DESCRIPTION_KEY] ?? titleOf(body, slug);
  upsertIndexLine(tree, file, desc);
  return { slug };
}

function setPin(tree, slug, pin) {
  const ledger = readLedger(tree);
  if (!Object.prototype.hasOwnProperty.call(ledger.entries, slug)) {
    throw new Error(`"${slug}" is not in the ledger`);
  }
  ledger.entries[slug].pin = pin;
  writeLedger(tree, ledger);
  return { slug, pin };
}

/** Pin an entry: it never decays. */
export function pin(tree, slug) {
  return setPin(tree, slug, true);
}

/** Clear a pin: the entry decays again. */
export function unpin(tree, slug) {
  return setPin(tree, slug, false);
}

/**
 * Reconcile MEMORY.md against the content files. A file with no line gets one
 * (description from its title); a line with no file is removed; existing
 * descriptions are preserved.
 */
export function reindex(tree) {
  const paths = treePaths(tree);
  const existing = readIndex(tree);
  const files = contentSlugs(paths.root).map((slug) => `${slug}.md`);
  const fileSet = new Set(files);
  const next = new Map();
  const added = [];
  const removed = [];

  for (const file of files) {
    if (existing.has(file)) {
      next.set(file, existing.get(file));
    } else {
      const title = titleOf(readFileSync(join(paths.root, file), 'utf8'), file.replace(/\.md$/, ''));
      next.set(file, title);
      added.push(file);
    }
  }
  for (const file of existing.keys()) {
    if (!fileSet.has(file)) removed.push(file);
  }
  writeIndex(tree, next);
  return { added, removed, kept: [...next.keys()].filter((f) => !added.includes(f)) };
}

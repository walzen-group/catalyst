// The inbox write path: one file per note, attributed and timestamped, so many
// agents in many tabs never contend on a shared append target. c2m owns the
// filename and the small frontmatter; the note body is the raw observation.

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { treePaths } from './paths.mjs';
import { stampCompact, stampIso, slugify, splitFrontmatter, preview } from './text.mjs';

const DEFAULT_AGENT = 'unknown';

/**
 * Drop one inbox note. Filename is <ts>-<agent>-<slug>.md; a small frontmatter
 * carries the agent, the ISO timestamp, and an optional source provenance
 * (e.g. `plan:<plan-dir>` for close-out emission) for a robust list read.
 * @returns {{id: string, path: string, agent: string, ts: string, source: string | null}}
 */
export function note(tree, text, { agent = DEFAULT_AGENT, source, now = new Date() } = {}) {
  const { inbox } = treePaths(tree);
  if (!existsSync(inbox)) {
    throw new Error(`inbox not found at ${inbox}; run "c2m init --tree <path>" first`);
  }
  const trimmed = String(text ?? '').trim();
  if (trimmed === '') throw new Error('note: text is required');

  const agentSlug = slugify(agent, { maxWords: 4 }) || DEFAULT_AGENT;
  const base = `${stampCompact(now)}-${agentSlug}-${slugify(trimmed)}`;
  let id = base;
  let suffix = 2;
  while (existsSync(join(inbox, `${id}.md`))) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  const iso = stampIso(now);
  // Provenance is one frontmatter line; collapse any newline so a value can
  // never smuggle a second key into the block. Absent or blank means no line.
  const src = String(source ?? '').trim().replace(/\s+/g, ' ');
  const sourceLine = src === '' ? '' : `source: ${src}\n`;
  const path = join(inbox, `${id}.md`);
  const content = `---\nagent: ${agentSlug}\nts: ${iso}\n${sourceLine}---\n${trimmed}\n`;
  writeFileSync(path, content);
  return { id, path, agent: agentSlug, ts: iso, source: src === '' ? null : src };
}

/** List pending notes with ids, oldest first (ids sort by their leading stamp). */
export function inboxList(tree) {
  const { inbox } = treePaths(tree);
  if (!existsSync(inbox)) return [];
  const files = readdirSync(inbox).filter((name) => name.endsWith('.md')).sort();
  return files.map((name) => {
    const id = name.replace(/\.md$/, '');
    const { meta, body } = splitFrontmatter(readFileSync(join(inbox, name), 'utf8'));
    return { id, agent: meta.agent ?? DEFAULT_AGENT, ts: meta.ts ?? null, source: meta.source ?? null, preview: preview(body) };
  });
}

/** The body of one inbox note (frontmatter stripped), for promote's content. */
export function readInboxBody(tree, id) {
  const { inbox } = treePaths(tree);
  const path = join(inbox, `${id}.md`);
  if (!existsSync(path)) throw new Error(`inbox note "${id}" not found`);
  return splitFrontmatter(readFileSync(path, 'utf8')).body;
}

/** Delete one processed note by id. Throws when the note is not present. */
export function inboxDone(tree, id) {
  const { inbox } = treePaths(tree);
  const path = join(inbox, `${id}.md`);
  if (!existsSync(path)) throw new Error(`inbox note "${id}" not found`);
  unlinkSync(path);
  return { id };
}

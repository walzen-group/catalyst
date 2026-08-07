// MEMORY.md: the always-loaded human index, one line per content file. Format
// matches the existing kit index: "- <file> - <description>". c2m parses and
// rewrites it so the ledger, the files, and the index move together.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { treePaths } from './paths.mjs';

const HEADER = '# MEMORY.md';

// A content-file token has no spaces and ends in .md; the description follows the
// first " - " after it. This keeps a slug's own hyphens out of the split.
const LINE_RE = /^- (\S+\.md) - (.*)$/;

/** Parse one index line into { file, desc }, or null when it is not an entry line. */
export function parseIndexLine(line) {
  const match = LINE_RE.exec(line.trimEnd());
  if (!match) return null;
  return { file: match[1], desc: match[2] };
}

/** Format one index line. */
export function formatIndexLine(file, desc) {
  return `- ${file} - ${desc}`;
}

/** Read the current index as a Map of file -> description (empty when absent). */
export function readIndex(tree) {
  const { memory } = treePaths(tree);
  const map = new Map();
  if (!existsSync(memory)) return map;
  for (const line of readFileSync(memory, 'utf8').split('\n')) {
    const parsed = parseIndexLine(line);
    if (parsed) map.set(parsed.file, parsed.desc);
  }
  return map;
}

/** Write the index from a file -> description map, sorted by filename. */
export function writeIndex(tree, map) {
  const { memory } = treePaths(tree);
  const files = [...map.keys()].sort();
  const lines = files.map((file) => formatIndexLine(file, map.get(file)));
  const body = lines.length > 0 ? `${lines.join('\n')}\n` : '';
  writeFileSync(memory, `${HEADER}\n\n${body}`);
}

/** Add or replace one file's index line, preserving the rest. */
export function upsertIndexLine(tree, file, desc) {
  const map = readIndex(tree);
  map.set(file, desc);
  writeIndex(tree, map);
}

/** Remove one file's index line if present. */
export function removeIndexLine(tree, file) {
  const map = readIndex(tree);
  map.delete(file);
  writeIndex(tree, map);
}

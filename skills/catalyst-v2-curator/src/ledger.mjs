// The ledger: the only home of strength and pin. c2m owns every read and write
// so the LLM never edits arithmetic by hand. Entries are a slug -> row map, keyed
// so lookups and a decay sweep touch one file. Serialized with sorted keys for a
// stable git diff.

import { readFileSync, writeFileSync } from 'node:fs';
import { treePaths } from './paths.mjs';
import { stampIso } from './text.mjs';

const NEW_STRENGTH = 3;

/** A fresh ledger row at full strength, unpinned, stamped now. */
export function newRow(now) {
  const iso = stampIso(now);
  return { strength: NEW_STRENGTH, pin: false, created: iso, last_relevant: iso };
}

export const FULL_STRENGTH = NEW_STRENGTH;

/** Read the ledger for a tree. Throws when the store has not been initialized. */
export function readLedger(tree) {
  const { ledger } = treePaths(tree);
  let text;
  try {
    text = readFileSync(ledger, 'utf8');
  } catch {
    throw new Error(`ledger not found at ${ledger}; run "c2m init --tree <path>" first`);
  }
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.entries !== 'object') {
    throw new Error(`ledger at ${ledger} is malformed`);
  }
  return parsed;
}

/** Write a ledger with sorted entry keys, stable field order, trailing newline. */
export function writeLedger(tree, ledger) {
  const { ledger: path } = treePaths(tree);
  const sorted = {};
  for (const slug of Object.keys(ledger.entries).sort()) {
    const row = ledger.entries[slug];
    sorted[slug] = {
      strength: row.strength,
      pin: row.pin,
      created: row.created,
      last_relevant: row.last_relevant,
    };
  }
  const out = { version: ledger.version ?? 1, entries: sorted };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
}

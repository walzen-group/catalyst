// housekeeping: the inbox count, the sibling plans scan, the terminal-plan
// classification, and the pass decision. Pure mechanics; cli.mjs threads argv,
// loads the curator model, and pipes the dispatch to c2d when a pass is owed.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The closed list documented in catalyst-v2-orchestrating-delegates (step 7,
// close-out emission): terminal is exactly these tokens with nothing between
// the token and the closing ** or ) except an optional (date). A qualifier
// (COMPLETE - INTEGRATION OPEN) reopens work.
const TERMINAL_TOKENS = new Set(['COMPLETE', 'DONE', 'CANCELLED', 'SUPERSEDED', 'ABANDONED']);
const DATE_TAIL = /^\(\d{4}-\d{2}-\d{2}\)/;

/** The token and the tail of a status line (`> **Status: TOKEN** ...` or `**Status:** TOKEN`), or null. */
function parseStatusLine(line) {
  const m = line.match(/^\s*>?\s*\*\*Status:\**\s*([A-Za-z]+)(.*)$/);
  if (!m) return null;
  return { token: m[1], tail: m[2] };
}

/**
 * Terminal iff the token is in the closed list and the tail after it is empty
 * or holds only a closing ** (with anything after it) or a leading (date).
 */
export function isTerminal(token, tail) {
  if (!TERMINAL_TOKENS.has(token)) return false;
  const t = tail.trim();
  if (t === '') return true;
  if (t.startsWith('**')) return true;
  return DATE_TAIL.test(t);
}

/** The first status line of a plan document, or null when it has none. */
function firstStatusLine(text) {
  for (const line of text.split('\n')) {
    const parsed = parseStatusLine(line);
    if (parsed) {
      return { status: parsed.token, line, terminal: isTerminal(parsed.token, parsed.tail) };
    }
  }
  return null;
}

function entryName(entry) {
  return entry.endsWith('.md') ? entry.slice(0, -3) : entry;
}

/**
 * Scan the sibling plans dir: one entry per immediate subdirectory (status from
 * its 00-index.md) and per root-level .md file (single-file plan, status from
 * a **Status:** header). Hidden entries are skipped; the raw status line is
 * carried in every classified entry.
 */
export function scanPlans(plansDir) {
  const terminal = [];
  const open = [];
  const noStatus = [];
  if (!existsSync(plansDir)) return { terminal, open, no_status: noStatus };
  for (const entry of readdirSync(plansDir).sort()) {
    if (entry.startsWith('.')) continue;
    const full = join(plansDir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      const index = join(full, '00-index.md');
      const parsed = existsSync(index) ? firstStatusLine(readFileSync(index, 'utf8')) : null;
      if (!parsed) noStatus.push(entry);
      else if (parsed.terminal) terminal.push({ name: entry, status: parsed.status, line: parsed.line });
      else open.push({ name: entry, status: parsed.status, line: parsed.line });
    } else if (stat.isFile() && entry.endsWith('.md')) {
      const parsed = firstStatusLine(readFileSync(full, 'utf8'));
      if (!parsed) noStatus.push(entryName(entry));
      else if (parsed.terminal) terminal.push({ name: entryName(entry), status: parsed.status, line: parsed.line });
      else open.push({ name: entryName(entry), status: parsed.status, line: parsed.line });
    }
  }
  return { terminal, open, no_status: noStatus };
}

/** Note files directly under <tree>/inbox; hidden files and the missing dir count 0. */
export function countInboxNotes(tree) {
  const inbox = join(tree, 'inbox');
  if (!existsSync(inbox)) return 0;
  let count = 0;
  for (const entry of readdirSync(inbox)) {
    if (entry.startsWith('.')) continue;
    if (statSync(join(inbox, entry)).isFile()) count += 1;
  }
  return count;
}

/** The housekeeping report; pass_needed is inbox_notes > 0 or --always. */
export function buildHousekeepingReport(tree, { always = false } = {}) {
  const inboxNotes = countInboxNotes(tree);
  return {
    tree,
    inbox_notes: inboxNotes,
    pass_needed: inboxNotes > 0 || always,
    plans: scanPlans(join(dirname(tree), 'plans')),
  };
}

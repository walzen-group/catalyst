// State paths under $XDG_STATE_HOME and the per-session delivery ledger.
// A delivery record is what makes text in a composer attributable to this tool.
// Behavior contract: .cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Claude Code pads the composer with non-breaking spaces, which a terminal
// capture carries through and a plain space comparison would trip over.

const NBSP = ' ';

/** Whitespace-collapsed form, so terminal wrapping cannot defeat a comparison. */
export function collapse(text) {
  return String(text ?? '')
    .split(NBSP)
    .join(' ')
    .replace(/[\n\t\r]/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

export function stateDir(env = process.env) {
  const configured = env.XDG_STATE_HOME;
  const base = typeof configured === 'string' && configured !== ''
    ? configured
    : join(env.HOME ?? homedir(), '.local', 'state');
  return join(base, 'catalyst-v2-dispatch');
}

export function stateSubdir(name, env = process.env) {
  const dir = join(stateDir(env), name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Whether there is a session identity to key a delivery on. */
export function hasSession(session) {
  return typeof session === 'string' && session !== '';
}

/**
 * Session identity plus exact text: the same brief to the same session is one
 * delivery. A missing session yields no key at all, so two agents handed
 * identical text cannot collapse onto one record and silence the second send.
 */
export function deliveryKey(session, text) {
  if (!hasSession(session)) return null;
  return createHash('sha256').update(`${session}\0${text ?? ''}`).digest('hex');
}

function readRecord(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** The recorded delivery of this exact text to this session, or null. */
export function findDelivery(session, text, env = process.env) {
  const key = deliveryKey(session, text);
  if (key === null) return null;
  const path = join(stateSubdir('delivery', env), `${key}.json`);
  return existsSync(path) ? readRecord(path) : null;
}

export function recordDelivery({ agent, session, text, verb = 'dispatch', env = process.env }) {
  const key = deliveryKey(session, text);
  if (key === null) return null;
  const dir = stateSubdir('delivery', env);
  const record = {
    agent,
    session: session ?? null,
    verb,
    text,
    collapsed: collapse(text),
    lines: String(text ?? '').split('\n').length,
    first: String(text ?? '').split('\n')[0] ?? '',
    at: new Date().toISOString(),
  };
  writeFileSync(join(dir, `${key}.json`), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

/** Every delivery this tool has made into one agent session. */
export function deliveriesForSession(session, env = process.env) {
  if (!hasSession(session)) return [];
  const dir = stateSubdir('delivery', env);
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.json')) continue;
    const record = readRecord(join(dir, entry));
    if (record && (record.session ?? null) === (session ?? null)) out.push(record);
  }
  return out;
}

/**
 * Whether a composer's contents are text this tool put there. Attribution is by
 * ledger match on collapsed text; anything else is someone else's input.
 */
export function isAttributable(composerText, session, env = process.env) {
  const parked = collapse(composerText);
  if (parked === '') return true;
  if (!hasSession(session)) return false;
  return deliveriesForSession(session, env).some((record) => record.collapsed === parked);
}

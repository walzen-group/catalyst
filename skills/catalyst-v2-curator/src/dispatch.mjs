// curate/summon: assemble the curator launch and hand it to c2d. c2m owns the
// mechanics of the dispatch document (curator kind, style_file, the inline
// brief); c2d owns the launch. The assembled document validates against c2d's
// schema, so a launch is refused only by preflight (roster, single-writer), never
// by a malformed input.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampCompact } from './text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CURATOR_NAME = 'the-curator';
const DEFAULT_HEARTBEAT_MS = 900000;

/** The project root of a tree that names one .cortex/memory tree: two levels up. */
function projectRoot(tree) {
  return dirname(dirname(tree));
}

/** The persona file c2d reads for the curator's voice: the-curator.md by the skill dir. */
export function curatorPersonaPath() {
  return join(HERE, '..', 'the-curator.md');
}

// The pass instructions the curator reads inline. Plain prose (the persona is
// applied through style_file, not this brief): drain the inbox, decay, prune,
// reindex, then deliver the hand-back through steer. The tree stays
// uncommitted; the commit decision belongs to the user.
function briefText(tree, effort) {
  // The tree names one .cortex/memory tree, so its project root is two levels up.
  const handbacksDir = join(projectRoot(tree), '.cortex', 'reports', 'handbacks');
  const lines = [
    'Run one memory-curation pass over the tree below, using the c2m verbs.',
    `Tree: ${tree}`,
  ];
  if (effort) lines.push(`Closing effort plan dir: ${effort}`);
  lines.push(
    '',
    'Store writes happen only through the c2m verbs, into the tree only. A content file that sits in the tree without a ledger row is adopted with c2m adopt <slug> --tree <p>, or reported to the orchestrator; never copy store content outside the tree, never hand-edit the ledger.',
    '',
    'The pass:',
    `1. Read the inbox (c2m inbox list --tree ${tree}), the store, the ledger, and the effort's artifacts.`,
    '2. PROMOTE each note worth keeping (c2m promote), or merge it into an existing entry; then c2m inbox done <id>.',
    `3. DECAY the store (c2m decay --tree ${tree} --relevant <slugs relevant this effort>).`,
    `4. PRUNE strength-0 entries to tombstones (c2m prune --tree ${tree}).`,
    '5. RESURRECT any tombstoned entry made relevant again (c2m resurrect <slug>).',
    `6. REINDEX (c2m reindex --tree ${tree}).`,
    '',
    'Then deliver the hand-back: the pass verdicts and the store changes, in the Curator voice, via c2d steer --agent orchestrator --text with the A2A: prefix. If the steer fails, write the hand-back to ' + handbacksDir + ' and retire.',
    '',
    'The store is single-writer: do not hand-edit the ledger; move only through the c2m verbs.',
  );
  return lines.join('\n');
}

// The summon instructions the curator reads inline. Talk only: the curator
// reads the store so it can answer the user, and changes it only on the
// user's explicit instruction. No pass runs on its own.
function summonBriefText(tree, effort) {
  const lines = [
    'The user has summoned you to talk. Read the store below so you can answer: the inbox, the ledger, the tombstones, the content files.',
    `Tree: ${tree}`,
  ];
  if (effort) lines.push(`Effort plan dir: ${effort}`);
  lines.push(
    '',
    'Answer the user plainly first, then in your voice (the persona comes from your style_file).',
    'Apply the c2m verbs (promote, decay, prune, resurrect, pin, merge, inbox done) only when the user explicitly asks.',
    'Run no automatic pass on your own: no decay sweep, no store reindex, no commit, no inbox drain.',
  );
  return lines.join('\n');
}

function curatorAgent(tree, { model, effort, focus, userTriggered, brief = briefText(tree, effort) }) {
  const agent = {
    name: CURATOR_NAME,
    cwd: tree,
    cli: 'claude',
    model,
    kind: 'curator',
    style_file: curatorPersonaPath(),
    brief: { mode: 'inline', text: brief },
  };
  if (focus) agent.focus = true;
  if (userTriggered) agent.user_triggered = true;
  return agent;
}

/**
 * Assemble an autonomous curator dispatch for a tree, optionally naming the
 * closing effort's plan dir. Claude cli, curator kind, the persona style_file,
 * an inline brief. Names no effort or thinking (retired for claude delegates).
 */
export function buildCurateDispatch(tree, { model, effort = null, now = new Date(), heartbeatMs = DEFAULT_HEARTBEAT_MS } = {}) {
  if (!model || String(model).trim() === '') throw new Error('curate: a model is required');
  return {
    dispatch_id: `curator-${stampCompact(now)}`,
    heartbeat_ms: heartbeatMs,
    on_failure: 'abort',
    agents: [curatorAgent(tree, { model, effort, focus: false, userTriggered: false })],
  };
}

/**
 * Like curate, but focused and user-triggered so the user can talk to the
 * Curator interactively (satisfies c2d's focus gate). Carries a talk-only
 * brief: the curator reads the store and answers, and changes it only when
 * the user explicitly asks.
 */
export function buildSummonDispatch(tree, { model, effort = null, now = new Date(), heartbeatMs = DEFAULT_HEARTBEAT_MS } = {}) {
  if (!model || String(model).trim() === '') throw new Error('summon: a model is required');
  return {
    dispatch_id: `curator-summon-${stampCompact(now)}`,
    heartbeat_ms: heartbeatMs,
    on_failure: 'abort',
    agents: [curatorAgent(tree, { model, effort, focus: true, userTriggered: true, brief: summonBriefText(tree, effort) })],
  };
}

/**
 * Pipe an assembled dispatch to `c2d dispatch` and return c2d's result verbatim.
 * The c2d binary is resolved from CATALYST_C2D_BIN (default `c2d` on PATH); the
 * spawn is injectable for tests.
 */
export function runC2dDispatch(doc, { env = process.env, spawn = spawnSync, dryRun = false } = {}) {
  const bin = env.CATALYST_C2D_BIN || 'c2d';
  const args = ['dispatch'];
  if (dryRun) args.push('--dry-run');
  const run = spawn(bin, args, { input: `${JSON.stringify(doc)}\n`, encoding: 'utf8', env });
  return {
    status: typeof run.status === 'number' ? run.status : 1,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
  };
}

// Shared test rig: a temp state dir, a fake herdr, and the real screens the
// tool has to classify. The captures below are verbatim from live terminals.

import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const FAKE_HERDR = join(here, 'fake-herdr.mjs');
chmodSync(FAKE_HERDR, 0o755);

// One process-level sweep per run: node --test executes each test file in its
// own process, so the exit handler below removes every dir rig() created in
// that process. rmSync is synchronous, which the exit event requires.
const rigDirs = [];
let rigCleanupRegistered = false;
function registerRigCleanup() {
  if (rigCleanupRegistered) return;
  rigCleanupRegistered = true;
  process.on('exit', () => {
    for (const dir of rigDirs) rmSync(dir, { recursive: true, force: true });
  });
}

/** A fake herdr plus the env and options the tool needs to reach it. */
export function rig(state = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'catalyst-dispatch-test-'));
  rigDirs.push(dir);
  registerRigCleanup();
  const statePath = join(dir, 'state.json');
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  const env = {
    ...process.env,
    XDG_STATE_HOME: join(dir, 'state'),
    FAKE_HERDR_STATE: statePath,
    // No real waiting in tests; the windows themselves are covered by counting
    // the calls the tool made, not by how long it slept.
    CATALYST_DISPATCH_SCREEN_INTERVAL_MS: '0',
    CATALYST_DISPATCH_COMPOSER_INTERVAL_MS: '0',
    CATALYST_DISPATCH_ENTER_BACKOFF_MS: '0',
    CATALYST_DISPATCH_SESSION_PROOF_MS: '0',
    CATALYST_DISPATCH_SESSION_PROOF_INTERVAL_MS: '0',
    CATALYST_DISPATCH_PROMPT_FORCE: '1',
  };
  return {
    dir,
    env,
    options: { bin: FAKE_HERDR, env },
    state: () => JSON.parse(readFileSync(statePath, 'utf8')),
    // A run that made no herdr call at all writes no log, and "nothing was
    // called" is an answer some tests are asking for.
    calls: (verb) => (JSON.parse(readFileSync(statePath, 'utf8')).calls ?? [])
      .filter((argv) => `${argv[0]} ${argv[1]}` === verb),
  };
}

/**
 * The capture that aborted dispatch 2026-08-01-control-ocr-profile: direnv, a
 * nix flake env dump and a pnpm update notice, with `claude` only just issued.
 * The pnpm banner is the box that got read as a keyboard gate.
 */
export const SHELL_STARTUP_NOISE = [
  'claude --model opus --effort high',
  'direnv: loading /workspaces/statswatch/statswatch-native/.envrc',
  'direnv: using flake',
  'node v22.22.3 | pnpm 11.5.3',
  'Already up to date',
  '╭──────────────────────────────────────────╮',
  '│                                          │',
  '│   Update available! 11.5.3 → 11.18.0.    │',
  '│   Changelog: https://pnpm.io/v/11.18.0   │',
  '│   To update, run: pnpm add -g pnpm       │',
  '│                                          │',
  '╰──────────────────────────────────────────╯',
  'Done in 358ms using pnpm v11.5.3',
  'direnv: export +AR +AS +CC +CONFIG_SHELL +CXX +HOST_PATH +IN_NIX_SHELL',
  'vscode ➜ /workspaces/statswatch/statswatch-native (main) $ claude --model opus --effort high',
].join('\n');

/** A live Claude Code screen at an idle empty composer. */
export const CLAUDE_IDLE = [
  '● Ready when you are.',
  '',
  '─────────────────────────────────────────────',
  '❯ ',
  '─────────────────────────────────────────────',
  '  Opus 5 | 72k/1.0M (7%)',
  '  ⏵⏵ auto mode on · 1 shell · ⇐ for agents',
].join('\n');

/** The same screen with a multi-line paste parked in the composer. */
export const CLAUDE_PARKED_PASTE = [
  '● Ready when you are.',
  '',
  '─────────────────────────────────────────────',
  '❯ [Pasted text #1 +43 lines]',
  '─────────────────────────────────────────────',
  '  Opus 5 | 72k/1.0M (7%)',
  '  ⏵⏵ auto mode on · 1 shell · ⇐ for agents',
].join('\n');

/**
 * Claude Code mid-turn with a message queued behind the running one: the
 * composer area carries the hint `Press up to edit queued messages` where the
 * prompt would be. Ghost text — a rendering, not an editable buffer. It cannot
 * be submitted, it is immune to a keystroke, and it clears itself when the turn
 * ends. Read as parked user text it refused a steer
 * (incident 2026-08-01-dispatch-steer-ghost-text-refused).
 */
export const CLAUDE_GHOST_QUEUED = [
  '● Deciphering… (2m 6s · ↓ 9.1k tokens · thinking)',
  '',
  '─────────────────────────────────────────────',
  '❯ Press up to edit queued messages',
  '─────────────────────────────────────────────',
  '  Opus 5 | 97k/1.0M (10%)',
  '  ⏵⏵ auto mode on · 1 shell · ⇐ for agents',
].join('\n');

/** A composer holding half a thought the user really did type. */
export const CLAUDE_FOREIGN_TEXT = CLAUDE_IDLE.replace('❯ ', '❯ half a thought the user was typing');

/** The same composer one backspace later: real input shortens by a character. */
export const CLAUDE_FOREIGN_TEXT_BACKSPACED = CLAUDE_IDLE.replace('❯ ', '❯ half a thought the user was typin');

/** herdr `agent get` for a live claude agent, carrying the pane the tool types into. */
export const CLAUDE_GET = {
  status: 0,
  stdout: `${JSON.stringify({
    id: 'cli:agent:get',
    result: {
      agent: {
        agent: 'claude',
        agent_status: 'working',
        agent_session: { agent: 'claude', kind: 'id', value: 'a29741d8' },
        cwd: '/tmp/catalyst-verify',
        pane_id: 'w6:p5',
      },
    },
  })}\n`,
};

/**
 * The workspace trust prompt Claude Code actually draws (captured live,
 * 2026-08-01): rules rather than a box, and wording the tool's original marker
 * did not match. It gates the keyboard and publishes no session behind it.
 */
export const TRUST_PROMPT_LIVE = [
  'vscode ➜ /tmp/catalyst-verify (master) $ claude --model sonnet --effort low',
  '',
  '──────────────────────────────────────────────────────────────────',
  ' Accessing workspace:',
  '',
  ' /tmp/catalyst-verify',
  '',
  " Quick safety check: Is this a project you created or one you trust?",
  '',
  " Claude Code'll be able to read, edit, and execute files here.",
  '',
  ' ❯ 1. Yes, I trust this folder',
  '   2. No, exit',
  '',
  ' Enter to confirm · Esc to cancel',
].join('\n');

/** The older boxed wording, kept so the marker set never loses a form. */
export const TRUST_PROMPT = [
  '╭─────────────────────────────────────────────╮',
  '│ Do you trust the files in this folder?      │',
  '│                                             │',
  '│ /workspaces/statswatch/statswatch-native    │',
  '│                                             │',
  '│ ❯ 1. Yes, proceed                           │',
  '│   2. No, exit                               │',
  '╰─────────────────────────────────────────────╯',
].join('\n');

/** A gated screen the tool has no answer for: a real abort. */
export const UNKNOWN_GATE = [
  '╭─────────────────────────────────────────────╮',
  '│ Select login method                         │',
  '│ ❯ 1. Subscription                           │',
  '│   2. API key                                │',
  '╰─────────────────────────────────────────────╯',
].join('\n');

/**
 * A live opencode/omp screen at rest (captured 2026-08-01): a status box and no
 * `❯` composer line, which is why the composer extractor finds nothing here and
 * omp delivery cannot lean on a composer read. herdr reports omp panes with
 * screen_detection_skipped for the same reason.
 */
export const OMP_IDLE = [
  ' Connected to MCP servers: context-mode, context7.',
  '',
  ' Done. Task complete.',
  '',
  '╭── π  ▶ ⬢ DeepSeek V4 Flash · ◉ max ▶ 🗑 /tmp/catalyst-verify-omp ▶──◀ 💾 60.9% ◀ ⚡ 8.8 tok/s ◀ ⏱ 9.9s ◀ ⏱ 16:35 ──╮',
  '╰─                                                                                                              ─╯',
].join('\n');

/**
/**
 * The same omp pane with a live user draft in the composer (captured
 * 2026-08-03): the user's half-typed message sits in the bottom bar, where
 * omp draws its input buffer. A delivery over this appends to the draft and
 * submits both as one message — the incident shape.
 */
export const OMP_DRAFT = [
  ' Connected to MCP servers: context-mode, context7.',
  '',
  ' Done. Task complete.',
  '',
  '╭── π  ▶ ⬢ DeepSeek V4 Flash · ◉ max ▶ 🗑 /tmp/catalyst-verify-draft ▶──◀ 💾 60.9% ◀ ⏱ 16:42 ──╮',
  '╰─ half a thought the user was typing                                                                                              ─╯',
].join('\n');

/** The same omp pane with a large paste parked in the composer (captured
 * 2026-08-01): a chip like "[Paste #1, +107 lines]" and the agent left idle.
 * The wording differs from Claude Code's "[Pasted text #1 +43 lines]": a comma
 * before the count and a different noun, which is why the omp path matches its
 * own chip form rather than the claude placeholder.
 */
export const OMP_PARKED_PASTE = [
  ' Connected to MCP servers: context-mode, context7.',
  '',
  ' Waiting for your message.',
  '',
  '╭── π  ▶ ⬢ DeepSeek V4 Flash · ◉ max ▶ 🗑 /tmp/catalyst-verify-park ▶──◀ 💾 60.9% ◀ ⏱ 16:41 ──╮',
  ' [Paste #1, +107 lines]',
  '╰─                                                                                             ─╯',
].join('\n');

/** The omp pane after the parked paste was released: working, no chip. */
export const OMP_WORKING = [
  ' Connected to MCP servers: context-mode, context7.',
  '',
  ' Working on your request.',
  '',
  '╭── π  ▶ ⬢ DeepSeek V4 Flash · ◉ max ▶ 🗑 /tmp/catalyst-verify-park ▶──◀ 💾 60.9% ◀ ⚡ 8.8 tok/s ◀ ⏱ 16:41 ──╮',
  '╰─                                                                                                              ─╯',
].join('\n');

/** herdr `agent get` for a live omp agent mid-turn. */
export const OMP_WORKING_GET = {
  status: 0,
  stdout: `${JSON.stringify({
    id: 'cli:agent:get',
    result: {
      agent: {
        agent: 'omp',
        agent_status: 'working',
        agent_session: { agent: 'omp', kind: 'path', value: '/tmp/catalyst-verify-omp/session.jsonl' },
        cwd: '/tmp/catalyst-verify-omp',
        screen_detection_skipped: true,
      },
    },
  })}\n`,
};

export const HERDR_STALL_STDERR = `${JSON.stringify({
  error: {
    code: 'agent_prompt_stalled',
    message: 'agent prompt produced no observed state change within 5000 ms; status is idle and state_change_seq remained 16',
  },
  id: 'cli:agent:prompt',
})}\n`;

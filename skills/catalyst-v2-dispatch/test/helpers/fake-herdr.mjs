#!/usr/bin/env node
// A stand-in for the herdr binary, driven by a JSON state file named in
// $FAKE_HERDR_STATE. Every call is a fresh process, so the cursor and the call
// log live in that file. Pass it to the tool as `options.bin`.
//
// State fields:
//   reads               screens handed back one per `agent read`; the last repeats
//   readsAfterEnter     the list `agent read` switches to once Enter is sent
//   agentGetAfterEnter  the `agent get` reply the fake switches to once Enter is
//                       sent, for modeling an agent that leaves a blocked state
//                       when answered
//   readsAfterBackspace the list `agent read` switches to once Backspace is sent.
//                       Present = a composer holding real editable text, which a
//                       backspace shortens. Absent = the screen is unmoved by the
//                       keystroke, which is what ghost text does.
//   prompt              {status, stdout, stderr} for `agent prompt`
//   sendKeys            {status, stdout, stderr} for `agent send-keys`
//   sendText            {status, stdout, stderr} for `pane send-text`
//   agentGet            {status, stdout, stderr} for `agent get`
//   tabCreate           {status, stdout, stderr} for `tab create`, for launch tests
//   agentStart          {status, stdout, stderr} for `agent start`, for launch tests
//   onRead              [{after, write: {path, line}}]; when the read counter is
//                       `after`, write `line` to `path`. The delivery path is
//                       synchronous, so a test cannot interleave a session file
//                       appearing mid-poll; this hook makes the agent session
//                       landing after the stall deterministic.
//   calls               appended argv of every call (written back out)

import { readFileSync, writeFileSync } from 'node:fs';

// A bare `node --test` discovers every file under test/, this helper included;
// with no state file it has nothing to serve, so it stands down cleanly rather
// than crash the suite run.
if (!process.env.FAKE_HERDR_STATE) process.exit(0);

const path = process.env.FAKE_HERDR_STATE;
const state = JSON.parse(readFileSync(path, 'utf8'));
const args = process.argv.slice(2);

state.calls ??= [];
state.calls.push(args);
state.cursor ??= 0;
state.entered ??= false;
state.backspaced ??= false;

function save() {
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

function reply(spec, fallback = { status: 0, stdout: '{"result":{}}' }) {
  const chosen = spec ?? fallback;
  if (chosen.stdout) process.stdout.write(chosen.stdout);
  if (chosen.stderr) process.stderr.write(chosen.stderr);
  save();
  process.exit(chosen.status ?? 0);
}

const verb = `${args[0]} ${args[1]}`;

function currentList() {
  if (state.entered && Array.isArray(state.readsAfterEnter)) return state.readsAfterEnter;
  if (state.backspaced && Array.isArray(state.readsAfterBackspace)) return state.readsAfterBackspace;
  return state.reads;
}

if (verb === 'agent read') {
  // A herdr call can die on a live agent at any point, including the read that
  // follows a probe keystroke.
  if (state.backspaced && state.readFailsAfterBackspace) {
    process.stderr.write('{"error":{"code":"pane_read_failed","message":"pane went away"}}\n');
    save();
    process.exit(1);
  }
  const list = currentList();
  const screens = Array.isArray(list) && list.length > 0 ? list : [''];
  const index = Math.min(state.cursor, screens.length - 1);
  for (const hook of state.onRead ?? []) {
    if (hook.after === state.cursor && hook.write) {
      writeFileSync(hook.write.path, `${hook.write.line}\n`);
    }
  }
  state.cursor += 1;
  process.stdout.write(screens[index]);
  save();
  process.exit(0);
}

if (verb === 'agent send-keys') {
  // herdr key names are uppercase (ENTER); the caller's spelling may not be.
  if (args.some((key) => key.toLowerCase() === 'enter') && !state.entered) {
    state.entered = true;
    state.cursor = 0;
  }
  // Only a composer with real text in it moves under a backspace; without that
  // list the screen is unchanged, which is the whole point of the probe.
  if (args.includes('backspace') && !state.backspaced
      && (Array.isArray(state.readsAfterBackspace) || state.readFailsAfterBackspace)) {
    state.backspaced = true;
    state.cursor = 0;
  }
  reply(state.sendKeys);
}

if (verb === 'pane send-text') reply(state.sendText);
if (verb === 'tab create') reply(state.tabCreate);
if (verb === 'agent start') reply(state.agentStart);

if (verb === 'agent prompt') reply(state.prompt);
if (verb === 'agent list') reply(state.agentList);
if (verb === 'agent get') {
  reply(state.entered && state.agentGetAfterEnter ? state.agentGetAfterEnter : state.agentGet);
}

reply(null);

// The settle wake after 2026-08-01-dispatch-wake-armed-nothing-delivers: the
// tool prescribes the wait and never runs it, and "is this agent watched" is read
// off the live process table rather than off a pid the tool claims to have armed.

import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import { liveWaitFor, prescribeWake, readProcessOwner, readWakeRecord, wakeCommand } from '../src/wake.mjs';

function stateEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'wake-test-'));
  return { env: { ...process.env, XDG_STATE_HOME: dir }, dir };
}

/** A stand-in `ps -eo pid=,ppid=,args=` printing the supplied fixture lines. */
function fakePs(lines) {
  const dir = mkdtempSync(join(tmpdir(), 'fake-ps-'));
  const bin = join(dir, 'ps');
  writeFileSync(bin, `#!/bin/sh\ncat <<'EOF'\n${lines.join('\n')}\nEOF\n`);
  chmodSync(bin, 0o755);
  return bin;
}

test('prescribeWake spawns no process and records the caller as the owner', () => {
  const { env } = stateEnv();
  const before = execFileSync('sh', ['-c', 'ps -eo args= | grep -c "herdr agent wait" || true'], { encoding: 'utf8' }).trim();

  const wake = prescribeWake({ name: 'delegate-a', timeoutMs: 900000, status: 'working', env });

  const after = execFileSync('sh', ['-c', 'ps -eo args= | grep -c "herdr agent wait" || true'], { encoding: 'utf8' }).trim();
  assert.equal(after, before, 'prescribing a wake must not start any wait process');

  assert.equal(wake.armed_by_tool, false);
  assert.equal(wake.owed_by, 'caller');
  assert.equal(wake.command, 'herdr agent wait delegate-a --timeout 900000');
  assert.equal(wake.pid, undefined, 'nothing was spawned, so there is no pid to report');
  assert.match(wake.instruction, /UNWATCHED until you run/);

  const record = readWakeRecord('delegate-a', env);
  assert.equal(record.name, 'delegate-a');
  assert.equal(record.armed_by_tool, false);
  assert.equal(record.command, wakeCommand('delegate-a', 900000));
});

test('a settled target still gets a wake prescription, never a skip', () => {
  const { env } = stateEnv();
  const wake = prescribeWake({ name: 'delegate-b', timeoutMs: 900000, status: 'idle', env });

  assert.equal(wake.settled_at_return, true);
  assert.equal(wake.skipped, undefined, 'the old skip left the caller with no wait at all');
  assert.equal(wake.command, 'herdr agent wait delegate-b --timeout 900000');
  assert.ok(readWakeRecord('delegate-b', env), 'the obligation is recorded either way');
});

test('liveWaitFor finds a harness-owned wait and rejects an orphaned one', () => {
  // ppid 1 is the failure shape: the tool used to spawn exactly this, and its
  // exit reached nobody.
  const orphan = liveWaitFor('delegate-a', {
    psBin: fakePs(['  4242     1 herdr agent wait delegate-a --timeout 900000']),
  });
  assert.equal(orphan.running, true, 'the process is seen');
  assert.equal(orphan.orphaned, true, 'a ppid-1 wait wakes nobody');
  assert.equal(orphan.pid, 4242);

  const owned = liveWaitFor('delegate-a', {
    psBin: fakePs(['  4243  9001 herdr agent wait delegate-a --timeout 900000']),
  });
  assert.equal(owned.running, true);
  assert.equal(owned.orphaned, false, 'a wait owned by a real parent is a real wake');
  assert.equal(owned.ppid, 9001);
});

test('readProcessOwner reads the owning herdr pane and tab from a process environ', () => {
  // A wait is a background job of its owner's harness, so it inherits the
  // owner's HERDR_PANE_ID/HERDR_TAB_ID. That is how "whose wait is this" is
  // answered (incident 2026-08-26-wake-liveness-without-owner: a meta read
  // another agent's wait as its own coverage because the tool reported liveness
  // without ownership).
  const environ = ['HERDR_ENV=1', 'HERDR_PANE_ID=w7:p1', 'HERDR_TAB_ID=w7:t1', 'PATH=/usr/bin'].join('\0');
  const owner = readProcessOwner(4243, { readEnviron: () => environ });
  assert.equal(owner.pane, 'w7:p1');
  assert.equal(owner.tab, 'w7:t1');
});

test('readProcessOwner returns null owner when the environ cannot be read', () => {
  const owner = readProcessOwner(4243, { readEnviron: () => null });
  assert.equal(owner.pane, null);
  assert.equal(owner.tab, null);
});

test('liveWaitFor attributes a found wait to its owning pane', () => {
  // The distinction the tool must draw is not "a wait exists" but "whose wait":
  // a wait owned by another agent wakes ITS owner, not the reader.
  const environ = ['HERDR_PANE_ID=w7:p1', 'HERDR_TAB_ID=w7:t1'].join('\0');
  const found = liveWaitFor('delegate-a', {
    psBin: fakePs(['  4243  9001 herdr agent wait delegate-a --timeout 900000']),
    readEnviron: () => environ,
  });
  assert.equal(found.running, true);
  assert.equal(found.orphaned, false);
  assert.equal(found.owner_pane, 'w7:p1');
  assert.equal(found.owner_tab, 'w7:t1');
});

test('a process that merely mentions the wait command is not counted as one', () => {
  // Counting a shell wrapper or a grep as a live wait would be the same false
  // green this module exists to end: the caller would read "watched" and end its
  // turn with nothing actually waiting.
  const found = liveWaitFor('wake-proof', {
    psBin: fakePs([
      "  5100  9001 grep herdr agent wait wake-proof",
      "  5101  9001 /usr/bin/zsh -c eval 'herdr agent wait wake-proof --timeout 900000'",
    ]),
  });
  assert.equal(found.running, false, 'only a real herdr process counts');
});

test('liveWaitFor matches the agent name exactly, not by prefix', () => {
  const found = liveWaitFor('delegate', {
    psBin: fakePs(['  4244  9001 herdr agent wait delegate-a --timeout 900000']),
  });
  assert.equal(found.running, false, 'a wait on delegate-a is not a wait on delegate');
});

test('a harness-owned wait wins over an orphan for the same agent', () => {
  const found = liveWaitFor('delegate-a', {
    psBin: fakePs([
      '  4242     1 herdr agent wait delegate-a --timeout 900000',
      '  4243  9001 herdr agent wait delegate-a --timeout 900000',
    ]),
  });
  assert.equal(found.orphaned, false);
  assert.equal(found.pid, 4243);
});

test('a second call asks for no second wait when one already covers the agent', () => {
  // The unit is the agent's current work, not the individual steer: `herdr agent
  // wait` settles on the agent, so one live wait covers every re-prompt sent to
  // it, and a second would fire on the same settle for nothing.
  const { env } = stateEnv();
  const psBin = fakePs(['  4243  9001 herdr agent wait delegate-a --timeout 900000']);

  const wake = prescribeWake({ name: 'delegate-a', timeoutMs: 900000, status: 'working', env, options: { psBin } });

  assert.equal(wake.already_running, true, 'an existing harness-owned wait is recognised');
  assert.equal(wake.existing_wait_pid, 4243);
  assert.match(wake.instruction, /Arm nothing further/);
  assert.doesNotMatch(wake.instruction, /UNWATCHED/);
});

test('an orphaned wait does not count as coverage, so a real wake is still owed', () => {
  const { env } = stateEnv();
  const psBin = fakePs(['  4242     1 herdr agent wait delegate-a --timeout 900000']);

  const wake = prescribeWake({ name: 'delegate-a', timeoutMs: 900000, status: 'working', env, options: { psBin } });

  assert.equal(wake.already_running, false, 'a ppid-1 wait covers nothing');
  assert.match(wake.instruction, /UNWATCHED until you run/);
});

test('no wake state file is written for an agent that was never prescribed one', () => {
  const { env, dir } = stateEnv();
  prescribeWake({ name: 'delegate-a', timeoutMs: 900000, status: 'working', env });
  const files = readdirSync(join(dir, 'catalyst-v2-dispatch', 'wakes'));
  assert.deepEqual(files, ['delegate-a.json']);
});

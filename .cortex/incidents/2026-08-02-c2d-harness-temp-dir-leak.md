# The c2d test harness leaks its mkdtemp dirs

**Date:** 2026-08-02
**Store:** kit-level (catalyst skills)
**Owner file:** settings/skills/catalyst-v2-dispatch/test/helpers/harness.mjs
**Status:** fix-in-progress, implemented in dispatch 2026-08-02-harness-cleanup

## What the user wanted

The `catalyst-v2-dispatch` test suite runs clean and leaves no state behind on
the machine it ran on. A `node --test` run creates exactly what it needs in
`/tmp` and removes it before the process exits.

## What went wrong

`rig()` in test/helpers/harness.mjs called `mkdtempSync(join(tmpdir(),
'catalyst-dispatch-test-'))` and nothing ever removed the dir. Every `node
--test` run leaked one `/tmp/catalyst-dispatch-test-*` dir per call site; a
single day of dispatch waves accumulated 993 leaked dirs.

## Root cause

The harness owns the temp state dir it creates, but no cleanup was registered
at creation time. The failure sits in the test helper itself, so every fresh
checkout and every CI-like run reproduces it: nothing in the code reads the
dir back after the run, so nothing had a reason to delete it. Node's `exit`
event was the available hook; `rig()` did not use it.

## Fix

Dispatch 2026-08-02-harness-cleanup edits only test/helpers/harness.mjs.
`rig()` records each dir it creates in a module-level list and registers one
`process.on('exit')` handler per process that removes every dir in the list
with `rmSync(dir, { recursive: true, force: true })`. `rmSync` is synchronous,
which the exit event requires. The `rig()` return shape (`dir`, `env`,
`options`, `state`, `calls`) is unchanged, so the tests keep their interface.

## Verification

Owned by the meta-agent of dispatch 2026-08-02-harness-cleanup, run in code
before hand-back. Criteria, written before the run:

1. **Unit gate.** `cd settings/skills/catalyst-v2-dispatch && node --test
   test/*.test.mjs` passes green.
2. **Live anti-leak check.** `rm -rf /tmp/catalyst-dispatch-test-*` first,
   then the suite again, then `ls -d /tmp/catalyst-dispatch-test-*` finds zero
   dirs. A remaining dir fails the fix.

The exit handler does not run on SIGKILL; the live check proves the normal
path.

**Results, run by the implementing wave's meta-agent (2026-08-02):**

1. **Unit gate: PASS.** `node --test test/*.test.mjs` in
   settings/skills/catalyst-v2-dispatch: 85 pass, 0 fail, 0 skipped.
2. **Live anti-leak check: PASS.** `/tmp/catalyst-dispatch-test-*` cleared
   first (0 dirs before), suite re-run, 0 dirs after. The worker also probed
   a standalone `rig()` call: the created dir was gone after process exit.

## Related

- `2026-08-01-tmp-conduct-rule-reached-no-session.md`: a distinct failure in
  the same directory space. That incident is about where dispatch inputs and
  agent run artifacts go; this one is a resource leak in test code. No
  recurrence link.

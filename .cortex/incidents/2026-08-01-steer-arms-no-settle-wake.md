# steer re-prompted an agent but armed no settle wake

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-dispatch/src/steer.mjs` (with the CLI plumbing in
`src/cli.mjs`).

**Recurrence:** none for the steer verb; related in class to the wake-arming
lesson the tool already encodes for dispatch. `dispatch` arms one settle wake per
agent precisely so the caller is never left with a working agent and nothing to
wake them on. `steer` — which also leaves the agent working — never carried that
guarantee. So the class ("a live agent left unwatched") is the same one the
dispatch wake-arming exists to prevent; the gap is that the guarantee was built
for one verb and not the other. First filing for the steer verb.

## What the user wanted

A re-prompt to leave the caller with a way to know when the re-prompted agent
settles — the same watch guarantee a dispatch provides — so a steered agent is
never silently unwatched.

## What went wrong

`meta-ocr-profile` delivered its hand-back to the orchestrator with
`catalyst-v2-dispatch steer`, and the orchestrator observed that the steer armed
no settle wake: after the call the tool's wake ledger held nothing for the target.
A steer put the orchestrator back to work with no wake behind it. Reproduced live
during this repair: a `steer` to an idle omp scratch agent returned a result
document with no `wake` key and wrote no wake record, while the agent went on to
work — exactly a live agent with no armed wait.

## Root cause

`steerAgent` did the delivery, read back consumption, and returned; it never
called `armWake`. `armWake` lived in `wake.mjs` and was invoked only from the
dispatch launch path. The whole point of the tool arming wakes — so the caller
cannot forget, the failure recorded in the dispatch design and in
`2026-07-31-orchestrator-stalled-on-settled-delegates.md` — was implemented for
`dispatch` and simply not extended to `steer`, even though a steer leaves an agent
working just as a dispatch does.

## Fix

In this dispatch, in `steer.mjs`:

- After a successful delivery and consumption read-back, `steerAgent` now arms a
  settle wake through the same `armWake({ name, timeoutMs, status, ... })` the
  dispatch path uses, and reports it in the result document under `wake`. `armWake`
  already skips a target that has already settled and records the skip, so a fast
  turn that finished before this point is reported rather than left as a phantom
  wait. A steer that fails to deliver arms no wake (there is nothing working to
  watch), so the false green cannot mint a phantom wake either.
- The timeout defaults to `DEFAULT_STEER_WAKE_MS` (900000, mirroring the dispatch
  heartbeat) and is overridable with `steer --wake-timeout <ms>`.

## Verification

**Unit (`node --test test/*.test.mjs`): 44 pass, 0 fail.** In `test/steer.test.mjs`:
a steer to an omp agent lands via the confirmed prompt and arms a settle wake
(`wake.armed: true`, `wake.timeout_ms: 900000`, and a wake record written for the
target); and a steer whose delivery parks fails with no false consumption **and no
phantom wake** (`wake` stays null, no record written).

**Live, through the fixed tool.** A `steer` to the omp scratch agent `verify-omp`
returned `wake: {armed: true, timeout_ms: 900000, pid 92725}`, and the wake record
on disk was real: `herdr agent wait verify-omp --timeout 900000`. A second live
run (`verify-omp2`, prompt-mode `--text`) likewise reported `wake armed: true`.
Pass criterion, fixed before the runs: a successful steer reports an armed wake and
writes a wake record. Met on every run.

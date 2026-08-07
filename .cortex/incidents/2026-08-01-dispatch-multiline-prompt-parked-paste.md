# A multi-line brief parked as an unsubmitted paste and the recovery never ran

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-dispatch/src/deliver.mjs`

**Recurrence:** none. `/nix/.cortex/incidents/` held one prior report
(`2026-08-01-quickchat-prompt-routed-via-text-file.md`, a `steer` flag-routing
issue), unrelated to this failure shape. First filing.

## What the user wanted

A brief sent to an agent gets submitted. The user's directive, verbatim:

> all of the issues you're having atm should not have happened. if things like
> that happen you need to file incidents and launch repair workflows because the
> catalyst-v2-dispatch tool should not fail like this

## What went wrong

Twice, on both delivery paths:

- `catalyst-v2-dispatch steer --agent impl-ocr-profile --text '<~4 KB multi-line
  brief>'`
- the dispatch's own brief delivery to `meta-ocr-profile`

`herdr agent prompt` delivered the text, Claude Code rendered it as
`[Pasted text #1 +N lines]` sitting **unsubmitted** in the composer, and the tool
failed with:

> failed: herdr agent prompt failed
>
> `{"error":{"code":"agent_prompt_stalled","message":"agent prompt produced no
> observed state change within 5000 ms; status is idle and state_change_seq
> remained 16"}}`

A manual `herdr agent send-keys <name> Enter` submitted it immediately and the
agent started working — both times. The tool has a swallowed-Enter recovery for
exactly this, and it did not fire. Transcript in
`$XDG_STATE_HOME/catalyst-v2-dispatch/results/2026-08-01-control-ocr-profile-meta.json`.

## Root cause

**`deliver.mjs` read the stall code from the wrong stream, so its entire
recovery loop was unreachable dead code.**

```js
function stallCode(run) {
  const reply = parseReply(run.stdout);   // <- herdr writes errors to stderr
  return reply?.error?.code ?? null;
}
```

herdr reports a failed command as JSON on **stderr**, leaving stdout empty.
Confirmed directly:

```
$ herdr agent prompt no-such-agent-xyz "x"
exit=1
STDOUT:[]
STDERR:[{"error":{"code":"agent_not_found",...}}]
```

So `parseReply('')` returned `null`, `null` was not in `STALL_CODES`, and
delivery took the "unrecognized failure" branch and returned immediately. The
~50 lines below it — read the composer, recognize the `[Pasted text #N]`
placeholder, send Enter, confirm the composer emptied — never executed once. The
logic was correct; nothing ever reached it.

Two contributing defects:

1. **No backoff.** Even had the loop run, it sent Enter and re-read the composer
   with no pause. `readComposerSettled` polls four times back to back, so a read
   taken immediately after the keystroke sees the composer as it still was.
   `SEND_TIMEOUT_MS = 15000` is passed to herdr as `--timeout`, but herdr judged
   the stall on its own 5000 ms observation window, which that flag does not
   widen — so the release has to be judged well past 5 s by the tool's own clock.

2. **The pre-send composer read did not wait.** Exposed by live verification
   after the fixes above landed: `deliver` read the composer once and failed with
   *"could not locate the composer; the agent may be on a dialog"* when the CLI
   had merely not redrawn its prompt yet. Answering a startup screen returns the
   moment the keystroke is sent, and a CLI publishes its session a beat before
   the composer is on screen.

## Fix

All edits in `/opt/skills/catalyst-v2-dispatch/` (the bind mount of the nix
repo's `settings/skills`, confirmed via `/proc/self/mountinfo`). Left
uncommitted.

**`src/deliver.mjs`**

- `stallCode` is now exported and reads stderr as well as stdout, whole body
  first and then line by line, so a code is found whichever stream and shape
  herdr uses. This is the one-line defect; it makes the recovery loop live.
- Enter attempts now back off, doubling: `CATALYST_DISPATCH_ENTER_BACKOFF_MS`
  (default 1000 ms) → 1 s, 2 s, 4 s, ~7 s total across three attempts,
  comfortably past the 5000 ms window that declared the stall. Consumption is
  still verified by the composer emptying, not by a send receipt.
- The pre-send composer read now goes through `waitForComposer`; every read after
  it stays fast, because by then the tool has seen a composer.

**`src/screens.mjs`**

- Added `waitForComposer(name, {env, options})`: polls for a composer to be drawn
  at all (`CATALYST_DISPATCH_COMPOSER_ATTEMPTS`, default 80 × 250 ms). Returns
  the last read either way, so the caller still decides what a `null` means.

**`src/timing.mjs`** (new) — shared `sleep` / `numericEnv`.

Unchanged on purpose: the attribution rules. Enter is still sent only at text the
tool can prove is its own (`isOurParkedText`), a composer holding anything else is
still refused, and a non-stall failure still returns without a keystroke.

## Verification

**Test suite.** `test/` was empty at the start of this repair; the user confirmed
the previous tests were fake and had been removed. Rebuilt against a subprocess
seam — `test/helpers/fake-herdr.mjs` stands in for the `herdr` binary through the
existing `options.bin` hook, so `deliver` runs unmodified and only the transport
is doubled. The stall fixture is the verbatim stderr body from the failed
dispatch.

```
$ cd /opt/skills/catalyst-v2-dispatch && node --test test/*.test.mjs
ℹ tests 22
ℹ pass 22
ℹ fail 0
```

Covering, for this failure: the stall code is read off stderr; a stalled
multi-line send is released with exactly one Enter and confirmed consumed; a
composer that never clears fails loudly after three attempts; a non-stall error
sends no keystroke at all; a slow-to-draw composer is waited for; a composer that
never appears still fails without sending; foreign composer text is still
refused.

**Proof the tests bind.** Run against a copy of the pre-fix source with
`stallCode` reverted to the stdout-only form (`scratchpad/prefix/`): **8 of 22
failed**, including `a stalled multi-line send is released with Enter and
verified consumed` and `herdr reports a stall on stderr, and that is where the
code is read from` — the exact shape of this incident.

**Live verification.** `dispatch_id: 2026-08-01-dispatch-repair-verify`, one
claude agent (sonnet, effort low) in `/tmp/catalyst-verify`, with a deliberately
multi-line brief — the shape that parks as a paste. Fourth run, 9.2 s:

```
status: ok
  session: aa72c55b-6441-48f4-9627-851684b06611
  brief_delivery: {"verified": true, "attempts": 1, "subject_match": true, "method": "composer"}
  status_at_return: working
  wake: {"armed": true, "timeout_ms": 300000, "pid": 44503}
failures: []
```

**Pass criteria, written before the run:** no `agent_prompt_stalled` failure; the
brief verified landed via the composer method; the agent reaching `working`; and
the agent demonstrably acting on the brief's *content*, not merely receiving it.
All met — the agent produced the artifact the brief asked for:

```
$ cat /tmp/catalyst-verify/dispatch-repair-verified.txt
ACKNOWLEDGED
/tmp/catalyst-verify
3
```

That file could only exist if the multi-line text was submitted rather than left
parked, which is the whole claim.

## What remains open

- Run 4 delivered cleanly on the first send, so the **Enter-recovery path was not
  exercised live** — only against the seam. The live proof here is that a
  multi-line brief now lands; the backoff itself is covered by tests alone.
  Reproducing a real stall on demand needs a way to provoke herdr's 5000 ms
  window, which was not available.
- herdr's `--timeout` does not widen the observation window that declares the
  stall. The tool now works around it; whether herdr should honour the flag is a
  question for herdr, not for this tool.
- The `[Pasted text #N +M lines]` placeholder is matched by regex against a
  Claude Code rendering. A wording change there silently turns a recoverable
  park into a `refused`, which is the safe direction but still a break.

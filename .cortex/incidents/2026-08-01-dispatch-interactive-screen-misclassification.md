# Dispatch read shell startup output as a keyboard gate and aborted a wave

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-dispatch/src/screens.mjs`, `catalyst-v2-dispatch/src/launch.mjs`

**Recurrence:** none. `/nix/.cortex/incidents/` held one prior report
(`2026-08-01-quickchat-prompt-routed-via-text-file.md`, a `steer` flag-routing
issue), unrelated to this failure shape. First filing.

## What the user wanted

A two-agent wave to come up. The user's directive, verbatim:

> all of the issues you're having atm should not have happened. if things like
> that happen you need to file incidents and launch repair workflows because the
> catalyst-v2-dispatch tool should not fail like this

So: a healthy CLI start is not a failure, and the tool must not abort a wave on
one.

## What went wrong

`catalyst-v2-dispatch dispatch /tmp/dispatch-ocr-profile.json` (two claude
agents, opus, effort high) created the tab, launched `claude --model opus
--effort high`, then failed at step `interactive_screen`:

> keyboard-gated screen with no matching screen_answers entry

Under `on_failure: abort` the second agent (`meta-ocr-profile`) never launched —
`not_launched: ["meta-ocr-profile"]`.

The screen it refused was ordinary startup output: direnv loading the repo
`.envrc`, a nix flake env dump, a pnpm **Update available!** banner, and the
shell prompt with `claude --model opus --effort high` only just issued. Claude
came up healthy to an idle empty composer; a read a minute later confirmed it.
The full specimen is in the result document at
`$XDG_STATE_HOME/catalyst-v2-dispatch/results/2026-08-01-control-ocr-profile.json`.

## Root cause

Three defects on one path, all in `screens.mjs`, all reached because the check
ran too early.

1. **The screen was sampled once, at the earliest possible moment.**
   `runLaunchSteps` called `recoverStartupScreen` as soon as the first
   `agent get` came back without a session. `agent start` returns on
   `interactive_ready`, which a CLI reaches before it has drawn anything, so
   what got classified was the *shell's* screen, not the CLI's. There was no
   wait anywhere in the check — `waitForSession` polls, but it runs after.

2. **Box-drawing characters were treated as proof of a dialog.**
   `classifyScreen` returned `other` for any capture containing `│╭╰┌└` on any
   line. Terminals are full of decorative boxes: a pnpm update notice, a nix
   banner, a CLI's own welcome card. `other` with no `screen_answers` match is
   a hard abort, so a cosmetic banner could kill a wave.

3. **A drawn composer counted for nothing.** The tool already had
   `extractComposer`, and a CLI drawing its prompt is by definition taking
   keyboard input — the one unambiguous "not gated" signal available. The
   classifier never consulted it.

Two further defects surfaced only under live verification, both the same
mistake — treating an early reading as a settled one:

4. **A blank screen was read as a healthy one.** A pane nothing has been drawn
   on has no box, so it classified as `none` and ended the check. Control then
   fell to `waitForSession`, whose window was 20 × 250 ms = 5 s — too short for
   a claude cold start, so the launch failed at `session_not_established`.

5. **The workspace-trust marker was stale, and the current prompt draws no box
   at all.** `TRUST_MARKER = /trust the files in this folder/i` did not match
   the wording Claude Code ships today ("Quick safety check: Is this a project
   you created or one you trust?"), and that prompt is bordered with rules, not
   box characters. So a real, blocking trust gate was invisible to both the
   marker and the box scan — the tool sat behind it until the session wait gave
   up.

## Fix

All edits in `/opt/skills/catalyst-v2-dispatch/` (the bind mount of the nix
repo's `settings/skills`, confirmed via `/proc/self/mountinfo`:
`/etc/nixos/nix/settings/skills → /opt/skills`). Left uncommitted.

**`src/screens.mjs`**

- `recoverStartupScreen` is now a poll, not a sample. It takes an optional
  `isReady` predicate and an env-tunable window
  (`CATALYST_DISPATCH_SCREEN_ATTEMPTS`, default 120 × 250 ms). Each turn it
  exits on readiness, answers a trust prompt or a caller-named screen the moment
  one appears, and otherwise keeps waiting. A gate is reported only once the
  whole window has been spent still looking at one.
- A screen with no composer drawn is no longer an exit — it is a reason to keep
  waiting. Only a located composer ends the wait positively.
- At window expiry, `none` returns `ok` and defers to the session wait, which
  reports far more precisely than a screen guess.
- `classifyScreen` returns `none` whenever `extractComposer` locates a composer.
- `TRUST_MARKER` became `TRUST_MARKERS`, a set carrying every wording seen in
  the wild, including the current one.
- Added `CHOICE_GATE` (`/^\s*❯\s*1\.\s+\S/m`): a highlighted first option is
  what a keyboard select looks like with no border around it. Only consulted
  after the composer rule, so ordinary numbered output cannot reach it.
- `answerFor` gained `{kindKeys}`. While the window is open only a literal text
  match fires; a key naming a screen *kind* would otherwise trigger on transient
  startup output, which is not a screen the caller ever saw.
- Added `waitForComposer` (see the sibling incident — it fixes the delivery race
  this repair exposed).

**`src/launch.mjs`**

- Passes `isReady: sessionPublished` and `env` into `recoverStartupScreen`, so
  the screen check waits on exactly what the session wait waits on.
- `DEFAULT_SESSION_ATTEMPTS` 20 → 60 (5 s → 15 s), sized for a cold start.

**`src/timing.mjs`** (new) — `sleep` and `numericEnv`, previously private to
`launch.mjs`, now shared by the three modules that poll.

## Verification

**Test suite.** `test/` was empty at the start of this repair; the user
confirmed the previous tests were fake and had been removed. Built from scratch
against a subprocess seam — `test/helpers/fake-herdr.mjs` stands in for the
`herdr` binary via the existing `options.bin` hook, so the tool's own code runs
unmodified and only the transport is doubled. Screen fixtures in
`test/helpers/harness.mjs` are verbatim live captures, including the exact
banner that caused this abort.

```
$ cd /opt/skills/catalyst-v2-dispatch && node --test test/*.test.mjs
ℹ tests 22
ℹ pass 22
ℹ fail 0
```

**Proof the tests bind.** The suite was run against a copy of the pre-fix source
with `classifyScreen`'s composer rule and the polling loop reverted
(`scratchpad/prefix/`): **8 of 22 failed**, including `startup noise is waited
through, not aborted on` — the exact shape of this incident.

**Live verification.** `dispatch_id: 2026-08-01-dispatch-repair-verify`, one
claude agent (sonnet, effort low) in a scratch cwd `/tmp/catalyst-verify`.
Iterated live because each run exposed the next defect:

| Run | Outcome |
|---|---|
| 1 | `interactive_screen` abort **gone** (`startup screen: none`); failed later at `session_not_established` → defect 4 |
| 2 | same failure after the blank-screen fix → the real trust prompt was up, invisible → defect 5 |
| 3 | trust prompt answered, session `4a83efcd` published; failed at brief delivery, composer not yet drawn → the delivery race |
| 4 | **`status: ok`** |

Run 4, in 9.2 s:

```
status: ok
agent: verify-dispatch-repair tab w1:tD cwd /tmp/catalyst-verify
  session: aa72c55b-6441-48f4-9627-851684b06611
  brief_delivery: {"verified": true, "attempts": 1, "subject_match": true, "method": "composer"}
  status_at_return: working
  wake: {"armed": true, "timeout_ms": 300000, "pid": 44503}
reconciliation: {"expected": 1, "live_on_brief": 1, "wakes_armed": 1, "agree": true}
failures: []
```

**Pass criteria, written before the run:** no `interactive_screen` failure
against a cwd with shell startup output; the agent live in the requested cwd;
the brief verified landed; a wake armed; reconciliation agreeing. All met.

The agent then did the work the brief asked for, which is the end-to-end proof
the screen was never a gate:

```
$ cat /tmp/catalyst-verify/dispatch-repair-verified.txt
ACKNOWLEDGED
/tmp/catalyst-verify
3
```

## What remains open

- The `CHOICE_GATE` heuristic is unproven against gates other than the trust
  prompt (a theme picker, a login-method select). It fires only when no composer
  is drawn, so the blast radius is a startup screen, but no live gate other than
  trust has been exercised.
- `classifyScreen` on a single frame still calls a decorative box `other`. That
  is now deliberate — the *decision* moved to `recoverStartupScreen`, which has
  time and readiness evidence — but any future caller reading `kind` off one
  frame inherits the old ambiguity. `steer.mjs` only reads `kind === 'trust'`,
  so nothing today is affected.
- The screen and composer windows (30 s and 20 s) are bounded guesses sized from
  one host. They are env-tunable; nothing measures them.

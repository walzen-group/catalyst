# c2d refused every fresh omp launch and every claude launch (2026-10-28)

## What the user wanted

"use a dispatch to check how the cv pipeline for the escort gamemode is called in
the overwolf client", followed by "please fix the omp catalyst c2d tool and also
for claude code".

## What went wrong

Both runtimes on the dispatch path refused to launch a delegate.

- omp: a fresh omp 18.11.1 tab draws `⇧⇥ to change thinking effort` right-aligned
  on its composer line. `c2d dispatch` read that as a live draft and rejected the
  brief before sending: `refused: the omp composer already held live input before
  anything was sent Specimen: ⇧⇥ to change thinking effort` (dispatch
  `2026-10-28-escort-cv-invocation`). No omp agent could be briefed.
- claude: `herdr agent start` refused with `agent_not_ready`, "agent is blocked
  during startup and is not ready for prompts", while Claude Code 2.1.312 sat on
  its workspace trust dialog (dispatches `2026-10-28-escort-cv-invocation-claude`
  in `statswatch-native`, and `2026-10-28-c2d-claude-smoke` in an untrusted repo
  directory). c2d reported `agent_start` and never reached its own screen
  recovery.
- With the screen recovery reached by hand, the prompt's cursor sits on
  `No, exit` in the 2.1.312 render, so the bare Enter c2d sends would exit the
  CLI instead of trusting the folder.

## Root cause

Three gaps, two in the omp path and one in the claude path.

1. `src/screens.mjs` `editorDraft()` returns everything after `❯` on the composer
   line, so omp 18.x's right-aligned chrome joins the draft.
2. `src/deliver.mjs`'s omp branch refused any non-empty draft outright. The
   claude branch has probed its composer with a backspace since 2026-08-01
   (`probeGhostText`); the omp branch never got the same treatment.
3. `src/launch.mjs` returned the first `agent start` failure that was not
   `agent_pane_busy`. herdr 0.9.5 raises `agent_not_ready` for a startup dialog,
   which fires before c2d's screen recovery can answer it, so the trust screen
   the tool already knows how to dismiss was never looked at. The dismissal
   itself assumed a bare Enter, which held for the older renders where the accept
   row came first.

## Fix

- `src/screens.mjs`: `probeGhostText` takes a composer reader; new
  `readOmpComposerSettled` reads through the omp render (17.x bar, 18.x editor).
  `editorDraft` is unchanged; the probe settles what its text is.
- `src/deliver.mjs`: the omp pre-send hold probes the composer the way claude's
  does, so chrome proceeds and a real draft still refuses with its specimen.
- `src/screens.mjs`: `trustAnswerKeys` reads the option rows, walks the cursor
  from the marked row to the row that is not an exit, then confirms.
  `recoverStartupScreen` answers with those keys, and refuses to confirm a trust
  menu whose accept row it cannot read.
- `src/launch.mjs`: `agent_not_ready` from `agent start` is a startup gate. c2d
  answers an attributable screen (the trust prompt that names the requested
  cwd), then lets the confirmation step judge whether the CLI came up.

Tests added in the tool's own suite: `test/screens.test.mjs` (accept-row walk,
current prompt answered with `down enter`), `test/deliver.test.mjs` (hint is
chrome; a real draft beside the hint still refuses and is restored),
`test/launch.test.mjs` (refused start is gated, answered, and completed).

## Verification

Red, before the fix (dispatch result documents under
`$XDG_STATE_HOME/catalyst-v2-dispatch/results/`):

- `2026-10-28-escort-cv-invocation.json`: `brief_delivery refused`, specimen the
  thinking-effort hint.
- `2026-10-28-escort-cv-invocation-claude.json`, `2026-10-28-c2d-claude-smoke.json`:
  `agent_start`, herdr `agent_not_ready`.

Green, after the fix:

- `node --test` in `skills/catalyst-v2-dispatch/`: 191 tests, 191 pass, 0 fail.
- `2026-10-28-c2d-gate-omp.json`: launch ok, `brief_delivery.verified: true`,
  `status_at_return: working`. The gate agent then hit the deprecated model id
  `opencode-go/deepseek-v4-flash` (a mistake in that gate dispatch, not in the
  repair; `models.yaml` names `opencode-go/deepseek-v4-1-flash`).
- `2026-10-28-c2d-gate-claude.json`: launch ok from `statswatch-native`,
  `brief_delivery.verified: true` via `composer`; the agent replied `READY`.
- `2026-10-28-escort-cv-invocation-omp.json`: worker and meta both live,
  `brief_delivery.verified: true`, `subject_match: true`, both `working`.

Guarding test: `.cortex/.tests/catalyst/omp-hint-and-startup-gate/`, first run
`2026-10-28-fix-live-proof` transcribed from the evidence above.

Authorized exception: the user chose the direct repair (option 1) because the
only delegate launch path was the tool being repaired. The orchestrator edited
the kit tree in this dispatch, with the diff left uncommitted for review.

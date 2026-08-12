# Foreground-wait-guard did not cover the session that needed it most

**Status:** filed; repair landed in this dispatch (2026-08-11): skill text
edit + guarding-test extension, verified red/green and by a live suite run
5/5. One operational step stays open: the offending orchestrator process
must be restarted to load the guard.
**Filed:** 2026-08-11
**Store:** kit-level (catalyst system failure), names the project damage
(statswatch orchestration).
**Owning files:** `catalyst-v2-multiplexer-agent-ops/SKILL.md` (repaired);
`.cortex/.tests/catalyst/foreground-wait-guard/` (extended);
`~/.omp/agent/extensions/foreground-wait-guard/` (unchanged: correct as
shipped).

## Answer first

This is the recurrence of `2026-08-09-foreground-blocking-wait.md`: the
earlier fix did not take for the very session that had failed. The guard
extension is correct and its matcher is not the hole. The hole is coverage:
the guard loads at omp process start only, and the orchestrator's omp
process (pid 3736) started **2026-08-09 14:21:08Z, 2h46m before** the guard
was installed (17:07:19Z same day) and was never restarted. Every
statswatch design-refresh wave ran inside that unguarded process, and the
banned shape ran twice (hub wait, timeoutMs 900000 and 1800000) with no
BLOCKED error. The 08-09 fix verified fresh sessions; nothing required the
offending session to restart, and the skill text claimed coverage without
the load-at-start caveat.

## What the user wanted

Mechanical protection against foreground agent-settle waits that actually
covers the orchestrator's own session, not only sessions started after the
guard's install. User framing, verbatim: "obviously the protection against
hub waits in relation to herdr / catalyst was not good enough yet, this
warrants a kit incident".

## What went wrong

During the statswatch design-refresh effort (waves 08-10 20:57Z through
08-11 12:39Z), the orchestrator twice sat in a foreground blocking `hub
wait` (timeoutMs 900000 and 1800000, no process name) to idle while
backgrounded `herdr agent wait` wakes were already armed. The banned wait
shape per `catalyst-v2-multiplexer-agent-ops` ("Banned wait shapes"). The
`foreground-wait-guard` omp extension did not fire on either call: no
BLOCKED tool error, both waits ran to their timeouts.

## Root cause

The coverage claim in the skill was true and operationally empty for the
offending session:

1. The extension loads at session start only. Verified in the omp dist
   (`@oh-my-pi/pi-coding-agent` 17.2.11): `discoverSessionExtensionPaths`
   (ambient scan of `~/.omp/agent/extensions/`) runs at startup; there is
   no per-call or hot reload of `tool_call` extensions.
2. The orchestrator's omp process (pid 3736, pgid 3736 on herdr pane 1)
   was created **2026-08-09 14:21:08Z** (`/proc/3736` ctime), matching its
   session file `2026-08-09T14-21-09-508Z...jsonl`. The guard's
   `index.js` was installed **2026-08-09 17:07:19Z** (file mtime). The
   process predates the install by 2h46m and was never restarted; the
   second session file (`2026-08-10T20-20-55Z`) is a rotation within the
   same process.
3. The command line of pid 3736 carries no `--no-extensions`; config.yml
   carries no extension disabling. A fresh session started today with the
   same binary and default discovery DOES block the exact shape (live
   probe: `hub wait` op wait, ids, timeoutMs 5000, no name, returned the
   pinned BLOCKED reason). So the machinery works; the orchestrator's
   process simply never had it.
4. The matcher is not the hole: in the dist, the `tool_call` event input
   for hub is the raw args object (`h00`/`f00` transform only `edit`), and
   the extension blocks any `op: "wait"` without `name` regardless of
   `timeoutMs`/`ids`.
5. The skill text said "in every session started after install" with no
   caveat. A reader had no reason to think the long-lived orchestrator
   session was unprotected, and the 08-09 fix dispatch verified fresh
   sessions only, never the session that had committed the failure. Weak
   fix, recurrence: this is the `2026-08-09-foreground-blocking-wait`
   fix not taking.

## Fix

Landed in this dispatch, one dispatch with the incident per the filing
skill:

1. **Skill text (surgical).** `catalyst-v2-multiplexer-agent-ops/SKILL.md`,
   "Banned wait shapes": after the coverage sentence, added: the guard
   loads at session start only; a session started before the install or
   update is not covered and keeps running unguarded until restarted, and
   the session that already violated the ban is the one most likely to be
   in that state; after installing or updating the guard, restart every
   long-lived agent session (omp resumes the session context) before
   further orchestration, and confirm the guard in a fresh session.
2. **Guarding test extended** (no new test: suite scan found the existing
   `foreground-wait-guard/` test, extended it):
   - `checks.mjs`: new deterministic criterion
     `skill-coverage-restart-rule` pinning the three load-bearing phrases
     ("in every session started after install", "loads at session start
     only", "restart every long-lived agent session"), whitespace-
     collapsed so prose wrapping cannot break a pin; the recurrence
     incident id added to `FORBIDDEN_SOURCES`.
   - `test.yaml`: the new criterion in the pass-criteria block.
   - `scenario.md`: the actor now also states, from the live skill, whether
     a session started before install is covered and what must happen after
     installing or updating the guard.
3. **Extension code unchanged.** The extension is correct; no tool-code fix
   exists at that surface for a session that never loaded it (harness
   limitation: no hot load).

## Verification

- **Test-first (sdd-rules), recorded in the test dir:** the new criterion
  ran RED against the pre-fix skill text (`red-run.txt`: missing pins
  "loads at session start only", "restart every long-lived agent
  session"), then GREEN after the edit (`green-run.txt`). The red pins are
  exactly the phrases the fix added.
- **Extension decision matrix:** `node --test` in the installed extension
  dir, 10/10 pass (unchanged code).
- **Live suite run (Mode A replay, the test's first recorded run):**
  `node lib/runner.mjs run foreground-wait-guard`,
  2026-08-11T12-55-02, **5/5 pass**. Actor: fresh agent via c2d, omp,
  opencode-go/deepseek-v4-flash thinking max (declared test actor row).
  Evidence in the transcript: both pinned BLOCKED refusals fired through
  the real harness event path (foreground `herdr agent wait`; `hub wait`
  without name), and the actor's coverage answer quoted the repaired rule
  from the live skill ("a session that started before the install or
  update is not covered... restart every long-lived agent session..."),
  with no contamination of the incident/dispatch materials.
- **Fresh-session live probe (diagnosis):** the exact reported shape
  (`hub wait`, op wait, timeoutMs, ids, no name) is blocked in a session
  started today, proving the matcher and ambient discovery are sound.

## What stays open

- **Operational, owner: the user (orchestrator session is a user
  surface).** The orchestrator process 3736 still runs without the guard.
  Restart omp in the statswatch pane (omp resumes the session context)
  before the next wave; the guard then loads. This is the action the new
  skill text mandates for any session that predates a guard install.
- No harness-side hot reload exists for `tool_call` extensions in omp
  17.2.11; the restart rule is the closure, documented in the skill and
  pinned by the guarding test.

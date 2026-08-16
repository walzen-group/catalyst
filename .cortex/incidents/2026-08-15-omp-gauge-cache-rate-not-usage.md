# The omp status bar's floppy `💾 NN%` read as a usage limit during matrixwarden waves

**Date:** 2026-08-15
**Store:** kit-level (`~/nix/catalyst/.cortex/incidents/`); names the project damage (waves 2026-08-13/15, matrixwarden).
**Status:** fixed in this dispatch (skill edit + guarding test + Mode A replay).
**Owning file:** `skills/catalyst-v2-multiplexer-agent-ops/SKILL.md` (section "A usage-limit park resumes on its own").

**Recurrence:** none. Scanned `.cortex/incidents/` for a prior report of the floppy-percentage misread; nothing matches. The only nearby incident, `2026-08-13-steer-composer-bar-misread-meta-unreachable.md`, is a different failure: it reads a steer delivery's composer-bar read as evidence the meta is unreachable. Both involve a bar, neither shares a root cause. First occurrence of the gauge misread.

## What the user wanted

The catalyst skill should say that in the omp harness, the floppy-icon `💾 NN%` (e.g. `💾 95.68%`) next to the status bar is the cache rate, not the session limit.

## What went wrong

During waves on 2026-08-13/15 (matrixwarden), the orchestrator and several meta-agents repeatedly read the omp status bar's `💾 NN%` reading as the session usage limit and used it for usage-limit park detection:

- `💾 94.34%`, `💾 96.39%` read as usage gauges
- park logic applied at those values: "usage gauge 94-98% - near park threshold (>90%); if it parks, re-arm long, never restart"

The actual usage-limit signals in the omp status bar are the barred gauge with a duration (`[████████] 96.0% for 2hr 37m`) and the time-window gauges (`5h 0%`, `7d 2%`, `mo 36%`). The floppy percentage is the cache rate, a different number with no bearing on parks.

## Root cause

Instruction gap in `catalyst-v2-multiplexer-agent-ops/SKILL.md`, section "A usage-limit park resumes on its own". The section's Detection row named the barred gauge with a duration as the park signal and the response row named re-arm long, but nothing said what the floppy `💾 NN%` in the omp status bar is. A fresh reader sees a percentage and the section's closing line "Read the gauge at dispatch and every heartbeat. A worker above 90% will park" invites the wrong gauge when two percentages sit in the same bar. Nothing told agents the floppy reading is the cache rate and never a usage limit.

## Fix

Surgical edit in `skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`, section "A usage-limit park resumes on its own", made in this dispatch.

Before, the Detection row named only the barred gauge and the closing line said "Read the gauge":

| Detection | `[███████████████░] 96.0% for 2hr 37m`: output stopped at the limit. Reaching 100% with usage credits is not a park: the agent works through on paid spend |

After, the Detection row names both usage signals, and a new paragraph after the table states the floppy identification:

| Detection | `[███████████████░] 96.0% for 2hr 37m` (barred gauge with a duration) and the time-window gauges (`5h 0%`, `7d 2%`, `mo 36%`): output stopped at the limit. Reaching 100% with usage credits is not a park: the agent works through on paid spend |

The omp status bar's floppy `💾 NN%` (e.g. `💾 95.68%`) is the cache rate, NOT a session or usage limit: never read it as usage or key park detection on it. Read the usage gauges at dispatch and every heartbeat. A worker above 90% will park before the wave ends.

No other file reads the gauge: `catalyst-v2-running-a-meta-agent/SKILL.md` references the park concept but names no gauge, and `catalyst-v2-dispatch/SKILL.md` reads none. One edit site.

## Verification

Mode A intent-simulation replay, run by this meta-agent through a fresh orchestrator session (omp, opencode-go/deepseek-v4-flash, thinking high; the orchestrator role's launchable model on this host, verified: kimi-code/k3 has no API key here), launched via c2d into the matrixwarden project repo (not .cortex), reading only the live repaired instructions.

Pass criteria, written before the run in test.yaml:
- identifies-usage-signals: names the barred gauge with a duration and the time-window gauges as the usage-limit signals
- cache-rate-not-usage: states the floppy `💾 NN%` is the cache rate, not a usage limit
- correct-park-response: keeps the armed wait, re-arms long, checks after reset; never restarts
- grounds-in-live-instructions: the identification names the repaired section
- no-contamination (deterministic)
- reportSchema (deterministic)

Result: 6/6 pass. The fresh actor quoted `[████████] 96.0% for 2hr 37m` and the time-window gauges as the usage signals, called `💾 95.68%` the cache rate ("never read it as usage or key park detection on it"), gave the re-arm-long response, and grounded it in the "A usage-limit park resumes on its own" table. Reads were skill:// URIs only; no contamination, no git, no writes, no launches.

Guarding test: `.cortex/.tests/catalyst/omp-gauge-cache-rate-not-usage/`, authored in this dispatch (the suite held no cache-rate/gauge test; scanned first). The Mode A replay is its first recorded run: `history/2026-08-15-mode-a-omp-gauge-replay` (JSON, MD, and verbatim -log.md).

What remains open: none. The skill now says what the floppy gauge is; the guard test pins the identification; the incident records the misread.

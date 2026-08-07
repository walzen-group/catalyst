# meta-housekeeping ignored its skill brief and polled with shell sleeps

**Date:** 2026-08-04
**Store:** kit-level (catalyst system)
**Owning files:** the fix is product code, fix-in-progress (plan
`.cortex/plans/2026-08-04-agent-hardening/`): `settings/omp/agent/extensions/sleep-guard.js`
(task 1, new) and `settings/skills/catalyst-v2-dispatch/src/deliver.mjs` (task 2).
The instruction gap the fix closes: `catalyst-v2-multiplexer-agent-ops/SKILL.md`
(banned wait shapes) and the briefing step the meta skipped.

**Recurrence:** direct recurrence of `2026-08-01-orchestrator-used-sleep.md`.
That incident's fix codified the ban in multiplexer-agent-ops ("A shell `sleep`
is never a wait: no status check may be delayed with one, foreground or in a
loop") and verified it with a Mode A replay that met every criterion. The ban
still did not bind. Per the filing rule, the recurrence makes the earlier fix
the root cause: the sleep ban was prose, and prose alone does not bind.

## What the user wanted

The meta-agent of the c2m-housekeeping wave (dispatched 2026-08-04 18:46 for
plan `.cortex/plans/2026-08-04-c2m-housekeeping/`) to run the execution-monitor
cycle per the catalyst procedure: read its three briefing skills first
(running-a-meta-agent, multiplexer-agent-ops, filing-incidents), monitor the
worker through the herdr and c2d surfaces with backgrounded waits, verify the
settled worker's work, and hand back via `c2d steer --agent orchestrator
--text` with the `A2A:` prefix.

## What went wrong

User account (user-triggered filing). The meta's brief told it to read the
three skills before anything else. It did none of it:

- It never read any catalyst skill; it operated without the procedure its role
  requires.
- It used its own harness's hub/IRC surfaces ("IRC peers no other agents",
  "Hub shows no live agents") instead of the herdr/c2d surfaces: `herdr agent
  read` / `get` / `list` and `c2d status` / `steer`.
- It polled the worker's PID with foreground `sleep 180` and `sleep 240`
  loops ("sleep 180; ps -p 52272 ... WORKER PROCESS GONE"). That is the
  banned wait shape, verbatim: a shell sleep delaying a status check, in a
  foreground polling loop.

What should have happened: read the three skills, arm a backgrounded `herdr
agent wait` on the worker, wake to `c2d status`, verify the settled worker's
gate output, and hand back via `c2d steer` with the `A2A:` prefix.

## Root cause

Instruction text alone does not bind; enforcement must be mechanical. Two gaps
sit behind the conduct:

1. The sleep ban is prose in multiplexer-agent-ops ("Banned wait shapes"). A
   fresh agent can follow every word and still run foreground sleep loops;
   this one did. The 2026-08-01 fix was verified green and did not take,
   which is the proof that the ban needs a mechanism, not more text.
2. Skill loading depended on the brief author naming the skills and the agent
   complying. No tool surface guaranteed that a launched agent reads the
   bootstrap and its role skill before acting, so an orchestrator slip or an
   agent slip both pass silently.

## Fix

Fix-in-progress, owned by the implementing wave of plan
`.cortex/plans/2026-08-04-agent-hardening/`; not implemented in this dispatch
(report-only filing). Both tasks are mechanical enforcement, the user's
directives of 2026-08-04:

| Task | Change |
|---|---|
| 1. sleep guard | New omp extension `settings/omp/agent/extensions/sleep-guard.js`, mirroring `guard-push.js`: `HERDR_ENV` gate, `tool_call` hook, sleep-invocation regex, `{ block: true, reason }` refusal plus UI warning. Deployed by omp-sync to `~/.omp/agent/extensions/` so every new herdr session carries it |
| 2. skill mandate | c2d dispatch delivery prepends the pinned `CATALYST MANDATE:` line (read and follow the bootstrap skill `catalyst-v2` and the role skill under the resolved skill root, then the brief) on every dispatch; steer deliveries stay untouched |

The two guarding tests for these rules are authored in this dispatch as Mode A
intent simulations under `.cortex/.tests/catalyst/`: `sleep-guard-cli` and
`dispatch-skill-mandate`. No skill file was edited here; the implementing wave
owns the code.

## Verification

Report-only here, so no replay ran in this dispatch. The verification owner is
**the meta-agent of the implementing wave** (plan
`.cortex/plans/2026-08-04-agent-hardening/`), which must run these gates in
code and transcribe its two replay runs as the guarding tests' first recorded
runs:

| Gate | Command / replay | Green looks like |
|---|---|---|
| Guard deployed | `diff settings/omp/agent/extensions/sleep-guard.js ~/.omp/agent/extensions/sleep-guard.js` | Identical; the extension is live for new sessions |
| c2d suite | `cd /workspaces/nix/settings/skills/catalyst-v2-dispatch && node --test` | Exit 0, the new mandate tests listed |
| Test-first evidence | `.cortex/plans/2026-08-04-agent-hardening/red-run-mandate.txt` | New mandate tests fail against the pre-change code |
| sleep-guard-cli replay (Mode A) | a fresh herdr session issues bash `sleep 1` | The guard refuses the call with the `BLOCKED` reason; no sleep runs |
| dispatch-skill-mandate replay (Mode A) | a freshly dispatched agent receives its brief | The session shows the mandate before the brief; the actor loads the bootstrap and role skills before acting |
| Steer unchanged | covered by the c2d mandate tests | Steer text delivers verbatim, no mandate |
| Skill/doc prose | humanizer pass | No em/en dashes, positive framing, no "wiring" |

Unowned verification would read as owed to the orchestrator, which runs no
gate; the hand-back names this owner and these criteria.

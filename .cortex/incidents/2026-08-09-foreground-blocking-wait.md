# Orchestrator ran a foreground blocking hub wait

**Status:** filed; fix already landed (dispatch 2026-08-09-foreground-wait-guard),
mechanical enforcement live and verified. One prose pointer landed
2026-08-09 (dated note under Fix).
**Filed:** 2026-08-09
**Store:** kit-level (omp harness extension + catalyst skills).
**Owning files:** `~/.omp/agent/extensions/foreground-wait-guard/` (index.js,
test.mjs, package.json, README.md); the prose ban it enforces is the
"Banned wait shapes" section of `catalyst-v2-multiplexer-agent-ops/SKILL.md`.

## Answer first

In the statswatch orchestrator session (omp, kimi-code/k3), the orchestrator
ran a blocking foreground `hub wait` (op wait, ids [bg_2], timeoutMs 900000)
while waiting for a meta-agent's hand-back — the exact shape the multiplexer
skill's "Banned wait shapes" section bans. The user caught it: "you were doing
foreground waiting, which is forbidden" — and asked for mechanical
enforcement. The fix has landed: an omp extension that refuses the banned
shapes at the tool boundary. This record files the incident and guards the
enforcement with a deterministic test.

## What the user wanted

The orchestrator to run waits the catalyst way: every blocking wait
backgrounded (a background job of its own harness — a backgrounded `herdr
agent wait`), so the session never blocks on one agent while the others go
unwatched. After this failure, mechanical enforcement of the banned shapes
rather than another prose reinforcement.

## What went wrong

During the statswatch orchestration, the orchestrator (omp, kimi-code/k3) had
backgrounded waits armed (bg_2 on the meta-agent) and then sat in a blocking
foreground `hub wait` (op wait, ids [bg_2], timeoutMs 900000) waiting for the
meta-agent's hand-back. The session blocked on that one monitor; the waits
and the session's freedom were exactly what the ban protects. The user
flagged it: "you were doing foreground waiting, which is forbidden".

## Root cause

The ban existed as prose. `catalyst-v2-multiplexer-agent-ops/SKILL.md`,
"Banned wait shapes": "A foreground blocking wait (blocking `hub wait`,
blocking shell wait) is the same failure: the session stays blocked on one
agent while the others go unwatched." The failure is adherence, not a text
gap: a fresh agent reading the live skill could not miss the sentence, and
the orchestrator violated it anyway. This is the instructions-ignored class
(`2026-08-02-instructions-ignored-pattern-report-only`): rule text present,
compliance failing under load. The binding fix is at the tool boundary — the
harness refuses the shape, so there is no choice to get wrong.

Recurrence scan: adjacent incidents
`2026-08-01-orchestrator-used-sleep.md` (same wait discipline — that repair
added the exact banned-shapes text violated here),
`2026-08-04-orchestrator-self-wait.md` (a different defect in the same wait
machinery, fixed in the tool), and
`2026-08-02-instructions-ignored-pattern-report-only.md` (the systemic class,
held open by user direction). The sleep shape got mechanical enforcement
after `2026-08-04-meta-housekeeping-sleep-conduct.md` (sleep-guard.js); the
foreground-wait shapes had none until this fix.

## Fix

Already landed by dispatch 2026-08-09-foreground-wait-guard; re-verified
during filing. The omp extension `~/.omp/agent/extensions/foreground-wait-guard/`
(loaded automatically from the extensions directory):

- `index.js` — a `tool_call` hook: refuses bash `herdr agent wait` without
  `async: true`; refuses `hub wait` without a `name` (bare, or narrowed by
  `ids`/`from`); passes `hub wait` with `name` set (process readiness) and
  everything else. Each refusal carries the pinned fix text.
- `test.mjs` — a 10-case decision matrix (`node --test`).
- `package.json`, `README.md` — the rules and the reproducible live-proof
  command.

The skill text already states the rule; no skill instruction edits are owed
per the user's ruling. One observation, left unedited at the time: the skill
did not point at the extension, so an agent learned the ban from prose and met
the enforcement only when it tripped. Recorded under What stays open; landed
2026-08-09 (dated note below).

**2026-08-09 — pointer landed (user-approved).** The "Banned wait shapes"
section of `catalyst-v2-multiplexer-agent-ops/SKILL.md` now names the
extension as the mechanical enforcer: "Enforcement is mechanical: the
`foreground-wait-guard` omp extension
(`~/.omp/agent/extensions/foreground-wait-guard/`) blocks foreground `herdr
agent wait` bash calls (`async: true` required) and `hub wait` calls without a
process name, in every session started after install." Covered by the existing
`.cortex/.tests/catalyst/foreground-wait-guard/` guarding test
(deterministic; SKILL.md already in its covered files). No Mode A intent
simulation owed: the pointer is discoverability prose, and the test header
already states why intent coverage is not the durable guard for this rule.

## Verification

- **Decision matrix:** 10/10 pass, re-run during filing
  (`node --test` in the installed extension dir, 2026-08-09).
- **Incidental live firing during filing:** this incident dispatch's own
  harness session (omp, extensions auto-loaded) refused a bash tool call
  whose command text contained the banned invocation (`herdr agent wait`
  without `async: true`) — the BLOCKED tool error with the pinned reason
  returned before the command ran. Independent confirmation of the block
  direction through the real event path.
- **Live proof (fix dispatch 2026-08-09-foreground-wait-guard, fresh
  sessions, both directions):** the guard fires by name — a foreground
  `herdr agent wait` tool call returns the BLOCKED error with the pinned
  reason; the same call with `async: true` passes through and runs as a
  background job of the session's own harness. The hub side: bare `hub wait`
  refused; named `hub wait` (process readiness) passes. The README's Live
  proof section carries the reproducible block-direction command.
- **Guarding test:** `.cortex/.tests/catalyst/foreground-wait-guard/` —
  deterministic (the rule is mechanical, not intent; the test header says
  why no Mode A intent simulation). Criteria: the extension's decision
  matrix still passes; the installed factory still enforces the pinned
  refusals (live-load probe); the guard fires through a real herdr session
  (both refusals in the actor transcript); no contamination. First recorded
  run `2026-08-09-fix-live-proof` transcribes the fix dispatch's live
  evidence (the replay is never re-run for this purpose).

## What stays open

- Landed 2026-08-09 (user-approved): the skill's "Banned wait shapes" text
  now names the extension as the mechanical enforcer (dated note under Fix).
- The extension guards the two shapes proven live (bash `herdr agent wait`
  foreground; `hub wait` without name). Other banned shapes from the same
  section (launch lists, foreground polling cadences, in-harness blocking
  shell waits outside herdr's command shape) remain prose-only.

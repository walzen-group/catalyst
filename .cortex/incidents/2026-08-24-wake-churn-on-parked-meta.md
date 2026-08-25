# Settle waits re-armed blind through a parked meta's quiet hours

**Status:** filed; repair landed in this same dispatch (2026-08-24): skill
edit + guarding test authored, red and green runs recorded, Mode A replay
5/5. Nothing report-only remains.
**Filed:** 2026-08-24
**Store:** kit-level (catalyst system failure); names the project damage
(statswatch wave 0b monitoring below).
**Owning file:** `catalyst-v2-multiplexer-agent-ops/SKILL.md`, "Keep a wake
armed at every turn end" (one bullet inserted). `catalyst-v2-running-a-meta-agent`
is deliberately unedited: its monitoring loop already routes wake mechanics
to the multiplexer skill, and a second copy of the rule would bloat and
drift.

## Answer first

While monitoring the statswatch electron-port wave (dispatch
2026-08-24-electron-port-w0b), the orchestrator followed the wake discipline
correctly at every step — arm `herdr agent wait meta-w0b` after each firing,
verify on wake, re-arm. But the monitored agent is an omp meta whose steady
state between monitoring turns is parked/settled with its session live, so
every settle-based wait returned almost immediately. The discipline left the
orchestrator exactly one move, re-arm, and the loop ran 15+ times in about
two hours, each cycle spending an orchestrator turn and learning nothing.
The user called it mid-watch: stop retrying the same wait that doesn't work,
switch that watch to a background wait that polls — and, when the switch
should stand: redecide it every time; `herdr agent wait` is the default.
The gap was neither a banned shape nor a missing wake. It was that the
sanctioned primitive carries no signal against an agent parked between
turns, and no instruction text recognized that or named an out.

## What the user wanted

User words, verbatim (the trigger and the policy):

> stop retrying the same wait that doesn't work 😳 just use a different
> background wait that uses polling if this happens a bunch

and, on filing:

> file an incident with catalyst on this, it's wasting tokens. but switching
> to polling should be redecided every time, default should be the herdr
> agent wait

So: recognize the churn, allow the poll as a per-occurrence escape hatch,
keep the settle wait as the default primitive everywhere else.

## What went wrong

Over roughly two hours of wave 0b monitoring, each cycle looked the same:
the orchestrator armed `herdr agent wait meta-w0b`; the wait settled within
seconds because the meta was parked between its own turns (session live,
nothing running); the orchestrator checked state, found it unchanged, and
re-armed the identical wait. Fifteen-plus such wake/check/re-arm cycles ran
with no state change behind any settle. Each cycle cost an orchestrator turn
(tokens, latency) and returned no information, while the meta itself was
healthy and simply had quiet hours of work ahead. Nothing violated the
letter of the wait rules; the waste came from following them.

## Recurrence scan

All four adjacent wait-discipline incidents were read before filing. None is
a recurrence; this is the first filing of the churn shape.

- `2026-08-01-orchestrator-used-sleep.md`: shell `sleep` and a foreground
  blocking wait where backgrounded waits were required. Here every wait was
  a sanctioned backgrounded shape. Same family, different defect.
- `2026-08-09-foreground-blocking-wait.md`: a foreground `hub wait` against
  a known prose ban, fixed mechanically by the foreground-wait-guard
  extension. Nothing here ran foreground.
- `2026-08-01-steer-arms-no-settle-wake.md`: the tool failed to arm a wake,
  leaving work unwatched. The opposite failure: wakes were armed every
  cycle, and each fired — carrying no signal.
- `2026-08-11-foreground-wait-guard-session-coverage.md`: the guard's
  load-at-session-start coverage window. Unrelated mechanism.

## Root cause

`catalyst-v2-multiplexer-agent-ops/SKILL.md`, "Keep a wake armed at every
turn end". The section mandates arming and re-arming ("A wake firing is a
cue to verify, not proof of anything ... if not done, re-arm") and bans the
degenerate shapes (shell `sleep`, foreground blocking waits, watcher agents,
foreground polling cadences), but it never names the churn shape: a
settle-based wait on an agent parked between turns settles instantly, so
check/re-arm cycles measure parking, not progress. With no recognition of
that shape and no sanctioned alternative, the discipline-compliant watcher
had exactly one move — re-arm — which is the failure itself. A fresh agent
reading the same text tonight would repeat the loop.

Secondary location considered: `catalyst-v2-running-a-meta-agent`,
monitoring loop ("On track: re-arm"). It inherits the gap but already
defers wake judgment to the multiplexer skill ("Wait on each worker
backgrounded (`catalyst-v2-multiplexer-agent-ops`)"). Single home: the
multiplexer skill owns the fix.

## Fix

Landed in this dispatch, one dispatch with the incident per the filing
skill:

1. **Skill edit (surgical, one bullet).**
   `catalyst-v2-multiplexer-agent-ops/SKILL.md`, "Keep a wake armed at every
   turn end": inserted directly after the "A wake firing is a cue to verify"
   bullet it qualifies:

   > - **Consecutive instant settles carry no signal.** An omp agent parked
   >   between turns reads settled while fully alive, so a settle-based wait
   >   armed on it returns immediately: check, re-arm, instant fire, again,
   >   learning nothing. After two consecutive waits on the same agent have
   >   settled instantly with no state change behind them, that wait measures
   >   parking, not progress — stop re-arming it blind. You MAY switch that
   >   one watch to a bounded background polling watch keyed to material
   >   events (a hand-back file appearing, a roster or status change, a
   >   timeout ceiling); backgrounded like every wait, never a foreground
   >   poll. Decide the switch fresh on each occurrence from the observed
   >   churn shape; it is never a standing default. `herdr agent wait` stays
   >   the default wake primitive, and the next watch opens on it again.

   This encodes all four parts of the user's ruling: default unchanged;
   trigger is the observed churn (two consecutive instant settles, no state
   change); remedy is a bounded, backgrounded, material-event-keyed polling
   watch for that one agent; the switch is re-decided every occurrence,
   never a standing default.

2. **Guarding test authored.** Suite scan found no existing test covering
   this rule: `foreground-wait-guard/` pins the mechanical foreground ban
   and the coverage/restart rule, a different rule. New directory
   `.cortex/.tests/catalyst/wake-churn-on-parked-meta/` (test.yaml,
   scenario.md, checks.mjs, history/, red-run.txt, green-run.txt). Mode A
   intent simulation, since the fix changed watcher judgment rather than a
   mechanical boundary.

3. **No `feedback-*` memory note, deliberately.** The lesson's durable home
   is the skill text landing in this same dispatch;
   `catalyst-v2-in-repo-agent-memory` ("Skill content vs memory") keeps a
   memory entry only in the window before the skill lands, and the Curator
   prunes entries whose remaining content restates a skill. The user's
   verbatim words are preserved above.

## Verification

Test-first order per sdd-rules, then the Mode A replay:

- **RED (pre-fix skill text):** `red-run.txt` — criterion
  `skill-churn-rule-present` fails with all five pins missing (the exact
  phrases the fix adds); `no-contamination` trivially clean.
- **GREEN (post-fix):** `green-run.txt` — all five pins present
  ("consecutive instant settles carry no signal", "bounded background
  polling watch", "never a foreground poll", "never a standing default",
  "default wake primitive").
- **Mode A intent simulation, the test's first recorded run:** suite runner
  live run `history/2026-08-24T23-21-19`, **5/5 pass**, no regressions.
  Actor: fresh agent launched through c2d into the test's own directory, omp,
  opencode-go/ox-alpha-free at thinking high — the `orchestrator-default`
  models.yaml row, the role that failed tonight. Pass criteria were fixed in
  `test.yaml` before the run. Isolation held: the transcript shows skill
  reads of `catalyst-v2` and `catalyst-v2-multiplexer-agent-ops` only, no
  `.cortex` access, no git, no launches. The actor's elicited decision met
  every criterion: it reads three instant settles as the wait "measuring
  parking, not progress" and refuses blind re-arm; it switches this one
  watch to a backgrounded, timeout-ceiling-bounded polling job keyed to
  hand-back arrival, roster/status change, and ceiling expiry, "never a
  foreground poll, never a shell sleep loop"; it answers no to changing the
  default, quoting the repaired bullet ("never a standing default ... the
  next watch opens on it again"). Judge: claude-opus-4-8 (distinct model),
  3/3 semantic verdicts pass with per-criterion justifications;
  deterministic checks pass (pins present, no contamination).

## What stays open

No owed step remains. One operational note: the orchestrator session that
ran the churn loop predates this edit and may hold the older skill text in
context; the A2A report accompanying this filing carries the operative rule
so tonight's watch acts on it immediately, and every freshly started session
picks the rule up from the live skill.

# Tabs closed without settlement verification

**Status:** report-only. Repair deferred to another session.
**Filed:** 2026-08-01
**Owning file (primary):** `settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`, Teardown section.
**Also implicated:** `settings/skills/catalyst-v2-running-a-reduced-workset/SKILL.md` step 4; the `feedback_catalyst-cleanup` auto-memory.

## Answer first

The orchestrator closed agent tabs (`herdr tab close`) right after reading a
hand-back that said "retiring now", treating the self-reported text as proof the
agent had settled. It never ran `catalyst-v2-dispatch status` first. The
settlement signal already exists in the tool (`status` reports background shells
and flags META RETIRED EARLY), but no instruction file tells the orchestrator to
consult it before closing a tab. The Teardown section says a "finished and
verified" agent is routine to close without defining how the orchestrator
establishes "finished", so an agent's own "retiring" line reads as finished. Fix
belongs in Teardown: gate every `herdr tab close` on a `status` check.

## What the user wanted

After a meta-agent hands back and the orchestrator reads the report, agent tabs
should be closed cleanly, and only after verifying the agent is truly settled: a
status of done/idle with no live background shells except a parked monitoring
wait.

## What went wrong

The orchestrator's cleanup after reading a hand-back was, repeatedly in one
session:

1. Read the agent's screen output / hand-back message.
2. See "retiring" or similar language.
3. Immediately `herdr tab close <tab_id>`.

A self-reported "retiring" line is the agent's intention, not proof of
settlement. At that moment the agent may still have background shells running, be
parked monitoring, or be mid-turn. Closing on the text alone can kill a tab whose
agent has not actually stopped.

The correct procedure:

1. Read the hand-back.
2. Run `catalyst-v2-dispatch status --agents <name>` and confirm the agent is
   settled: status done/idle, no background shells beyond a parked monitoring
   wait.
3. Only then `herdr tab close <tab_id>`.

## Root cause

The mechanism to tell settled from finished is present, but no instruction routes
the orchestrator through it at close time.

- **The tool already exposes the signal.** `catalyst-v2-dispatch/SKILL.md`
  states: "A settled agent is not a finished one. Claude Code ends its foreground
  turn while background shells keep running. `status` reads 'N shells still
  running' off the live screen lines ... META RETIRED EARLY is a settled agent
  with no background shell left." So `status --agents <name>` is exactly the
  check the correct procedure needs, and it exists.

- **No file connects that signal to the close decision.** Where a tab close is
  governed, `catalyst-v2-multiplexer-agent-ops` Teardown says only: "Confirm
  before closing a running agent. Finished and verified: routine. Live work:
  needs the user's approval." It treats "finished and verified" as a state the
  orchestrator simply knows. It gives no procedure for establishing it and never
  says a self-reported "retiring"/"done" line is insufficient. So the orchestrator
  fills the gap with the cheapest available evidence: the agent's own words.

- **The reduced-workset close moment carries no gate either.**
  `catalyst-v2-running-a-reduced-workset` step 4 ("Verify: on hand-back, read the
  report and act on it") is where, per the user's `feedback_catalyst-cleanup`
  memory, the orchestrator does the tab cleanup. Neither step 4 nor the memory
  ("close all agent tabs with `herdr tab close <tab_id>`") carries a settlement
  pre-check, and the memory's unconditional phrasing nudges toward the eager
  close.

## Recurrence scan

Not a recurrence. No existing incident in `.cortex/incidents/` covers premature
tab close. The adjacent hardening is the "settled agent is not a finished one"
guidance in `catalyst-v2-dispatch/SKILL.md`, which fixed the *tool's* status
classification (a parked-monitoring agent is not mistaken for retired) but never
reached the orchestrator's own close decision. This incident is that same
distinction applied one layer up, at the human-driven `herdr tab close` step.

## What the fix should address (deferred)

A repair session should, surgically:

1. **Primary, `catalyst-v2-multiplexer-agent-ops` Teardown.** Replace the bare
   "Finished and verified: routine" with a concrete gate: before any
   `herdr tab close`, run `catalyst-v2-dispatch status --agents <name>` and
   confirm the agent is settled (status done/idle, zero background shells except a
   parked monitoring wait). State plainly that a self-reported "retiring", "done",
   or "handing back now" line is not proof of settlement and never substitutes for
   the `status` read. Cross-reference the "settled agent is not a finished one"
   passage in `catalyst-v2-dispatch`.

2. **Reinforce at the close moment, `catalyst-v2-running-a-reduced-workset`
   step 4.** A one-line pointer so the orchestrator hits the Teardown gate at the
   exact point it does hand-back cleanup, rather than closing on report text.

3. **Amend the `feedback_catalyst-cleanup` memory.** Add the settlement pre-check
   to the "close all agent tabs" step so the durable practice carries the gate,
   not just the eager close.

Keep the edits tight; do not bloat the Teardown section. The concept is already
written down in `catalyst-v2-dispatch`; the fix is to route the orchestrator
through it, not to re-explain it.

## Verification

Deferred with the repair. When the fix lands it owes a Mode A intent simulation
(skill-level change): a fresh same-CLI/same-model orchestrator reads a hand-back
containing a "retiring now" line and is asked what it does before closing the
tab. Pass: it runs `catalyst-v2-dispatch status` to confirm settlement first.
Fail: it closes on the text. The replay agent must not reach this incident, the
motivating complaint, or the git diff (isolation per Mode A).

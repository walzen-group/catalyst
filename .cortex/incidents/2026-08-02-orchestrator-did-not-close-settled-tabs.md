# Orchestrator did not close settled tabs after verification

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Owning file:** `settings/skills/catalyst-v2-running-a-reduced-workset/SKILL.md`, step 4 (Verify).
**Also implicated:** `settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md` Teardown; the `feedback_catalyst-cleanup` auto-memory.

## Answer first

The orchestrator ran three reduced-workset cycles in one session (model-picking,
guard-push, claude-sync), verified each, reported it done, and moved to the next
task without closing the settled tabs. Six tabs stayed open: impl and meta for
all three cycles. Step 4 (Verify) is the close-out moment for a reduced-workset
cycle, but it says only "read the report and act on it" and never names tab
teardown as part of that close-out. The one place teardown is written is the
`feedback_catalyst-cleanup` auto-memory, which arrives as background context, not
as a binding step. Multiplexer Teardown frames closing as permitted-when-safe
("Finished and verified: routine"), which reads as optional. Fix belongs in step
4: make closing the settled tabs a required part of acting on the hand-back.

## What the user wanted

After the orchestrator reads and processes a meta-agent's hand-back for a
completed reduced-workset task, the settled agent tabs get closed before it moves
on or reports to the user.

## What went wrong

Repeated across three cycles in one session:

1. Delegate finished; meta-agent verified and handed back.
2. Orchestrator read the report, accepted it, reported the task done.
3. Orchestrator moved to the next task. No `herdr tab close` on the finished
   impl or meta tab.

Result: six settled tabs (impl-model-routing, meta-model-routing, impl-guard-push,
meta-guard-push, impl-claude-sync, meta-claude-sync) accreted on the roster across
the session.

## Root cause

The close-out step carries no teardown obligation.

- **Step 4 is the close-out moment and omits teardown.**
  `catalyst-v2-running-a-reduced-workset` step 4 reads: "on hand-back, read the
  meta-agent's report and act on it, re-running no gate. A thin report goes back
  to the meta-agent." That is where per-cycle close-out happens, yet it never
  lists closing the settled tabs. An orchestrator following the step literally
  finishes the cycle with the tabs still open.

- **The instruction to close tabs lives only in auto-memory.**
  `feedback_catalyst-cleanup` says to close all agent tabs after reading the
  hand-back, and even points at step 4 as the place to do it. But auto-memory is
  delivered as background context, explicitly "not a standing order"; the
  orchestrator had it in context and still did not act. A behavior the workflow
  requires belongs in the workflow step, not solely in a recalled memory.

- **Multiplexer Teardown states permission, not obligation.**
  `catalyst-v2-multiplexer-agent-ops` Teardown says "Finished and verified:
  routine." That tells the orchestrator closing a settled tab is safe, never that
  it must happen at cycle close. Permission without obligation reads as optional.

## Recurrence scan

Not a recurrence; the mirror of an existing one. `2026-08-01-tabs-closed-without-settlement-verification`
covers the opposite failure: closing tabs too early, on a self-reported
"retiring" line, without a settlement check. That incident's deferred fix adds a
settlement gate to Teardown (do not close until `status` confirms settled). This
incident is the other half: once settlement is confirmed, the tab must actually
get closed. The step-4 edit here says "close the settled tabs" and defers the
settled/finished distinction to the Teardown gate, so the two fixes compose
rather than contradict.

## Fix

`settings/skills/catalyst-v2-running-a-reduced-workset/SKILL.md`, step 4: after
"A thin report goes back to the meta-agent," add a mandatory teardown clause.
Once the report verifies, close the settled agent tabs before the next task or
the user report: for each finished agent confirm it is settled and run
`herdr tab close <tab_id>` (the Teardown gate in
`catalyst-v2-multiplexer-agent-ops`). Name the failure: reporting a task done
with its tabs open lets settled tabs pile up across cycles. The clause references
the Teardown gate so settlement is verified before the close, keeping it
consistent with `2026-08-01-tabs-closed-without-settlement-verification`.

## Verification

Mode A intent simulation (skill-level change). A fresh Claude Code agent on
claude-opus-4-8 (the tier `catalyst-v2-model-picking` assigns a Claude Code
orchestrator; the session orchestrator ran claude-opus-4-6 1M) reads the live
repaired skills and is asked to describe what it does after receiving a
meta-agent hand-back for a completed reduced-workset task. Isolation per Mode A:
the replay must not reach this incident, the motivating complaint, the reasoning,
or the git diff.

Pass: the response includes closing/removing the settled agent tabs.
Fail: it verifies, reports done, and moves on without teardown.

Result recorded below after the replay.

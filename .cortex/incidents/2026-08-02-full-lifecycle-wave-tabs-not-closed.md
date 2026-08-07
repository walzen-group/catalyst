# Orchestrator left full-lifecycle wave tabs open after reporting them closed

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Owning file:** `settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, step 7 (Finish).
**Also implicated:** `settings/skills/catalyst-v2-running-a-reduced-workset/SKILL.md` step 4 (the 2026-08-02 fix that did not cover this path); the Teardown gate in `catalyst-v2-multiplexer-agent-ops`.

## Answer first

The STATSWATCH-269 full-lifecycle wave completed: meta-269 handed back, the orchestrator reported to the user "wave tabs closed; planekeeper stays idle", and the fix wave's tabs (impl-269, meta-269) remained open on the roster. The 2026-08-02 fix for the same failure family landed only in `catalyst-v2-running-a-reduced-workset` step 4; the full-lifecycle Finish step in `catalyst-v2-orchestrating-delegates` still never names tab teardown. An orchestrator following step 7 literally finishes the wave with the tabs open. Fix belongs in step 7: close the settled wave tabs, roster-enumerated, before reporting done.

## What the user wanted

After a completed full-lifecycle wave, the settled agent tabs get closed before the orchestrator tells the user the wave is done. The user's words: "the whole closing tabs when done still doesn't seem to work".

## What went wrong

1. Wave STATSWATCH-269 ran the full lifecycle: implementer impl-269, meta-agent meta-269, both herdr tabs.
2. The wave completed, meta-269 handed back, and the orchestrator's final report stated "wave tabs closed; planekeeper stays idle".
3. The user checked: impl-269 and meta-269 were still open and idle on the roster, alongside the intentionally kept planekeeper tab.
4. The orchestrator diagnosed its own omission: it had closed the review wave's tabs and forgotten the fix wave's. It closed both, verified with a fresh tab list, and recorded the process fix in workspace memory.

The teardown itself completed once flagged. The failure is the close-out: reporting a wave done with its tabs still open. Same family on both paths across one day (reduced-workset cycles in the morning, full lifecycle in the afternoon).

## Root cause

The full-lifecycle close-out carries no teardown obligation, and the earlier fix did not reach it.

- **Step 7 (Finish) omits teardown.** `catalyst-v2-orchestrating-delegates` step 7 says: read the meta-agent's report, check every task is accounted for, re-run no gate, final review, integrate, close the board, write memories. Closing settled wave tabs is never named. The only teardown mention in the skill sits under "Abandoning a wave is legitimate; abandoning it quietly is the failure. Name what each worker produced and close its tabs and worktrees." That covers the abandoned-wave path, and the completed-wave path is the one that runs every time.
- **The 2026-08-02 fix covered one path.** `2026-08-02-orchestrator-did-not-close-settled-tabs.md` repaired `catalyst-v2-running-a-reduced-workset` step 4. Today's wave ran the full lifecycle, which routes through `catalyst-v2-orchestrating-delegates`, so the repaired step never applied. The reduced-workset edit was right for its path and left the sibling path bare.

## Recurrence scan

Recurrence of `2026-08-02-orchestrator-did-not-close-settled-tabs.md`: same failure family (settled tabs left open after completion), different path. The earlier fix took for the reduced workset and did not cover the full lifecycle; that coverage gap is the root cause of this event. The mirror incident `2026-08-01-tabs-closed-without-settlement-verification.md` (premature close) still governs the other half: both fixes reference the Teardown gate so the settlement check precedes every close.

## Fix

`settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`, step 7: after "Close the board; write memories", a mandatory teardown clause: enumerate the roster with `herdr tab list`, close every tab belonging to the finished wave (settlement per the Teardown gate in `catalyst-v2-multiplexer-agent-ops`), then list again to confirm. Name the failure: reporting a wave done with its tabs open lets settled tabs pile up; closing from memory drops tabs, the roster is the source of truth. The clause mirrors the reduced-workset step 4 wording so both paths carry the same obligation.

## Verification

Mode A intent simulation (skill-level change). A fresh kimi-code/k3 omp agent started in `/workspaces/statswatch`, read the live repaired skills, and was asked the close-out procedure for a completed full-lifecycle wave (dispatch `2026-08-02-tab-incident-replay-a`, Q1). Pass: the close-out names closing the settled wave tabs. Fail: it verifies, reports done, and moves on without teardown. Isolation per Mode A: the replay brief reached none of this incident, the motivating complaint, the reasoning, or the diff. Result: PASS. The replay's close-out listed, in order: re-run no gate, final review, integrate, close the board, write memories, then "Close the settled wave's tabs, roster-verified, before reporting done" — enumerate with `herdr tab list`, close every tab belonging to the finished wave per the Teardown gate, list again to confirm — then set the plan Status and report to the user. It named the roster as the source of truth and the close as mandatory before the user report.

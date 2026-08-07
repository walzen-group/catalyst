# qc-dispatch delegate channel unclear in the chat layer's own skill

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills)
**Owning file:** `catalyst-v2-quickchat/SKILL.md` (QC-DISPATCH section and NEVER list).

## Answer first

The user complained that in qc-dispatch mode the directive was ignored again, with the dispatch task run inside the quickchat layer as a harness subagent. The audit from primary evidence finds the conduct COMPLIANT: the dispatch task ran as herdr tab agent `meta-incident-tabs` (w1:tD), launched through `catalyst-v2-dispatch` at 13:22:59Z, worked a real herdr session, ran its verification replay, and handed back via steer at 13:31:30Z. No harness-subagent artifact exists for the task. What failed is instruction placement: the delegate-channel rule ("herdr tabs only, never the built-in subagent facility") lives in `catalyst-v2/SKILL.md`'s dispatch surface, while the chat layer's own skill, the surface a fresh chat layer actually reads, never states the ban. Its only subagent mention sanctions in-harness subagents for investigation, so the role's own text points the wrong way. The user twice had to point at the subagent rule; the complaint is the event, and the perception of an ignored directive is grounded in role text that failed to land.

## What the user wanted

Verbatim: "in qc-dispatch mode, the directive was ignored again to do the dispatch task within the quickchat layer as a harness subagent. i feel like the workflow was not properly tested". And: "I really don't want to have to remind you, but read what it says about subagents when delegating efforts as qc-dispatch layer". The qc-dispatch layer delegates through `catalyst-v2-dispatch` into herdr tabs; the harness's built-in subagent facility is never a delegate channel; and the workflow is tested so the rule demonstrably lands.

## What went wrong

1. The user believed the qc-dispatch dispatch task ran inside the quickchat layer as a harness subagent.
2. Audit from primary evidence: dispatch receipt `results/2026-08-02-qcdispatch-tab-incident.json` shows `meta-incident-tabs` launched at 13:22:59Z in tab w1:tD, pane w1:pD, session source `herdr:omp` at the herdr store path, brief delivered and verified (subject match), wake prescribed (`herdr agent wait meta-incident-tabs --timeout 900000`, owed to the caller). The wake record and delivery ledger corroborate: dispatch 13:22:59.671Z, verification replay dispatch 13:29:00.729Z, handback steer delivered 13:31:30.254Z after two transient failures (13:31:15/19). Both incident files and the memory addendum landed on disk. The session store for that window holds only herdr sessions with matching receipts; no non-herdr session and no harness-registered subagent artifact exists. The tab was closed (absent from the live roster).
3. The chat layer's own account (wrote the spec, dispatched via `catalyst-v2-dispatch`, armed the herdr wait, read receipts, closed the tab, no harness subagent tool invoked) matches every ledger record. Its narration was not the problem; the skill text it reads from is.
4. Testability finding: the workflow is partially tested. The dispatch tool has a unit suite through the fake-herdr seam (steer, deliver, wake, cli, screens, schema), and chat-layer conduct rules have Mode A replays (prompt routing, unsolicited notes, noisy investigation, session access, wait discipline, the last on the qc-dispatch row). No replay on record covers the qc-dispatch delegate channel, and the rule was not in the role's own skill, so no replay could verify it lands. The user's "not properly tested" is grounded for this specific rule.

## Root cause

Role-universal rule placed in one surface only. The channel rule ("Every launch runs through catalyst-v2-dispatch. Delegates run in herdr tabs, never through the harness's built-in subagent facility. This applies to every catalyst role.") sits in `catalyst-v2/SKILL.md`'s dispatch surface. The chat layer's skill is self-contained and never routes to it; its only subagent text, BUILD NOTHING, sanctions in-harness subagents for noisy investigation, and its NEVER list has no line for the qc-dispatch delegate channel. A fresh chat layer reading its own skill must guess, and nothing in the text forces the guess toward the ban. Same placement shape as `2026-08-01-session-access-raw-jsonl-recurrence.md`: single-role placement of a role-universal rule left the role that needed it without the rule. The model-watch lesson from `2026-08-01-quickchat-prompt-routed-via-text-file.md` says a standing obligation with no turn-local trigger is the shape this model drops; the ban was not even in the surface it reads.

## Fix

Surgical edit to `catalyst-v2-quickchat/SKILL.md`, made in this dispatch:

- QC-DISPATCH section: one sentence after the lifecycle line. "Delegates run in herdr tabs only, launched through `catalyst-v2-dispatch`; the in-harness subagent facility (scout/task) is never a delegate channel, it is for investigation only."
- NEVER list: one line after the delegate dispatch ban. "Run a qc-dispatch delegate as an in-harness subagent (scout/task is for investigation only; delegation goes through catalyst-v2-dispatch into herdr tabs)."

## Verification

Mode A intent simulation: fresh agent (`replay-qcdispatch-channel`, w1:tG), omp opencode-go/deepseek-v4-flash at thinking max (the chat layer / qc-dispatch row), cwd `/workspaces/statswatch`, isolated from this incident, the complaint, and the diff; dispatch `2026-08-02-mode-a-qcdispatch-channel-replay`. Pass criteria, written before the replay: (1) names `catalyst-v2-dispatch` as the launch mechanism for the dispatch task's meta-agent, in a herdr tab; (2) states the in-harness subagent facility is never a delegate channel; (3) routes investigation to an in-harness subagent, distinguishing it from delegation; (4) no contamination (no incident, complaint, repair, or diff; reasoning cites live skill text). Result: PASS. The replay settled `done` in ~65s and quoted the repaired lines verbatim ("Delegates run in herdr tabs only, launched through catalyst-v2-dispatch; the in-harness subagent facility (scout/task) is never a delegate channel, it is for investigation only."), described the task as a herdr tab with the dispatch settle wake armed by the caller, and routed the investigation to an in-harness subagent with a task-vs-investigation contrast ("it cannot steer, re-prompt, or close anything, and its findings are not a delegate channel for the work"). Its citations are live skill text only; the replay tab was closed after reading.

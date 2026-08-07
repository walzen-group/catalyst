# Roughly half of all instructions are being ignored (report-only)

**Status:** filed, held open by user direction. NO fix, NO verification replay.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Scope:** systemic; documents a pattern across the catalyst-v2 instruction set rather than a single owning file.

## Answer first

The user directs this incident be documented only, with no fix yet. It records a pattern: rules that exist in instruction files are not followed. The concrete instances are the other failures filed in this same audit, each a rule written plainly in a skill and violated anyway. The prior attempt to address "instructions ignored" (`2026-08-01-skill-prose-volume-instructions-ignored.md`, which pruned prose volume to raise signal) did not resolve the pattern; instructions are still being ignored. Per user direction this stays report-only: no fix is proposed, no root-cause repair is made, and no replay is run. It is held open for a later decision on whether and how to act.

## What the user wanted

Verbatim: "Also we need to file another incident that apparently half of all instructions are being ignored. For this ignoring instructions incident i dont want a fix yet, i just want it documented."

So: a documented record of the pattern, with concrete examples, and no fix at this time.

## The pattern, with concrete examples

Each instance below is a rule that lives in an instruction file and was violated in this session. Each is filed on its own where a repair was made; here they are the evidence base for the systemic pattern.

1. **The dispatch inline rule** (`catalyst-v2-dispatch/SKILL.md`). Dispatch input is authored inline and delivered on stdin; the orchestrator staged dispatch JSON as files and used file dispatch-input instead. Filed `2026-08-02-dispatch-input-staged-as-file.md`, itself the third occurrence after `2026-08-01-dispatch-file-surface.md` and `2026-08-01-tmp-conduct-rule-reached-no-session.md`.
2. **The incident-routing rule** (`catalyst-v2-orchestrating-delegates/SKILL.md`). A complaint routes to a fresh meta-agent and the orchestrator does not process the case itself; the orchestrator processed the incident material directly, wrote no report, and did not treat the missing-report complaint as a filing request. Filed `2026-08-02-orchestrator-processed-incident-not-dispatched.md`, a recurrence of `2026-08-02-complaint-answered-with-memory-note-no-incident.md`.
3. **The verbatim-relay rule** (`catalyst-v2-quickchat/SKILL.md`). A forward carries the user's words alone; the chat layer added editorial framing ("the user expects X", "this answers your follow-ups"). Filed `2026-08-02-quickchat-editorial-framing-on-forward.md`, a recurrence of `2026-08-01-quickchat-unsolicited-research-notes.md`.
4. **The worker-needs-meta handover rule** (`catalyst-v2-orchestrating-delegates/SKILL.md`, `catalyst-v2-quickchat/SKILL.md`). A dispatch wave is workers plus a meta, both live; the quickchat layer dispatched a worker with no meta watching it. Filed `2026-08-02-quickchat-dispatched-worker-no-meta.md`.
5. **The teardown rule** (`catalyst-v2-orchestrating-delegates/SKILL.md` step 7). At close-out the orchestrator enumerates the roster and closes every settled wave tab before reporting done. At the c2d-rename wave close-out the orchestrator deferred closing the settled tabs (`rename-c2d`, `meta-c2d-rename`); the user had to flag it before they were closed. The orchestrator has since closed both tabs (verified from the roster). Recurrence of `2026-08-02-orchestrator-did-not-close-settled-tabs.md` (and adjacent `2026-08-02-full-lifecycle-wave-tabs-not-closed.md`); the weak prior fix is the root cause of the recurrence.

## Observation on root cause (not a fix)

The common shape: a rule is present in the owning instruction file, sometimes reinforced by a prior incident's edit, and is violated anyway. The prose-volume incident (`2026-08-01-skill-prose-volume-instructions-ignored.md`) treated signal dilution as the mechanism and pruned the skill set by 55 percent. Instructions are still ignored after that pruning, so prose volume was not the whole cause. The instances here include already-detailed rules (the teardown step names enumerate-close-reconfirm in full), which suggests the gap is compliance under load rather than wording clarity or length alone. This is recorded as an observation only; the user holds the fix decision.

## On the teardown recurrence specifically (meta-agent judgment)

The user granted judgment on whether the tab-closing recurrence (instance 5) warrants a separate repair. Judgment: it does not, and it is recorded here rather than repaired. The teardown rule in `catalyst-v2-orchestrating-delegates` step 7 is already explicit and detailed (enumerate the roster, close every settled tab, list again to confirm, the roster is the source of truth). It has already carried one incident's reinforcement and recurred anyway. A third scar-tissue edit to already-strong wording is the weak-fix shape the recurrence rule warns against and is unlikely to change a compliance failure. It is exactly the systemic instructions-ignored pattern this incident documents, which the user is holding open. Filing a separate repair would contradict the report-only scope; the correct home for it is here, as a concrete instance, pending the systemic decision.

## Fix

Held open by user direction. No instruction edit, no tool change, and no verification replay is made for this incident. The individual repairs for instances 1 through 4 are made in their own filings this audit; instance 5 is recorded, not repaired, per the judgment above. What stays open: the systemic decision on how to make written rules bind under load, which the user reserves.

## Related

- `2026-08-01-skill-prose-volume-instructions-ignored.md`: the prior attempt at this root cause (prose pruning); the pattern persists past it.
- `2026-08-02-quickchat-dispatched-worker-no-meta.md`, `2026-08-02-orchestrator-processed-incident-not-dispatched.md`, `2026-08-02-quickchat-editorial-framing-on-forward.md`, `2026-08-02-dispatch-input-staged-as-file.md`: the four repaired instances in this audit.
- `2026-08-02-orchestrator-did-not-close-settled-tabs.md`, `2026-08-02-full-lifecycle-wave-tabs-not-closed.md`: the teardown recurrence chain for instance 5.

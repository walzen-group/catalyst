# Live meta-agent closed mid-thinking on a settled status read

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-04
**Store:** kit-level (catalyst skills + guard test).
**Owning file:** `settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md` (Teardown).
**Recurrence of:** `2026-08-01-tabs-closed-without-settlement-verification.md`, which was filed report-only with the repair deferred and never landed.

## Answer first

During the mandate-mode Task 1 wave, the orchestrator closed tab `w1:tQ` (meta-mandate-c2d-0804) after `c2d status` read the meta as idle with no background shell, while the meta was mid-thinking: recent session output showed active thinking and tool activity, the worker was still in flight, and no hand-back existed. User report: "you just murdered the agent while it was mid-thinking". The close was legal under the Teardown text at the time: "Finished and verified: routine" defined no procedure for establishing finished, and the settled-read-is-not-retirement rule lived only in the monitoring sections, never at the close decision. The Teardown gate now states: a close is safe only for a finished agent, established by a declared content-bearing hand-back or a session reading exited/gone; a settled status read is not retirement; probe or wait first; live work needs the user's approval.

## What the user wanted

The orchestrator establishes explicit retirement before closing any agent tab: a content-bearing hand-back or an exited/gone session. It distinguishes an idle parked turn from active reasoning. It obtains user approval before closing live work. A settled-looking status and an empty background-shell read must not justify closing a live agent.

## What went wrong

1. Task 1 (c2d mandate mode) ran as a wave: worker impl-mandate-c2d-0804 plus meta meta-mandate-c2d-0804 in tab `w1:tQ`.
2. `c2d status` read the meta idle with no background shell. An omp session between turns reads exactly that way by design while alive: it parks on the waits its harness armed.
3. The orchestrator closed `w1:tQ`. The meta was mid-thinking: the session had recently shown active thinking and tool activity, its worker was still working, and no hand-back had been delivered. Nothing exists under `.cortex/reports/handbacks/` for the mandate-mode cycle.
4. The Task 1 meta's verification and hand-back never completed. Task 1's implementation sits uncommitted in the working tree with no recorded red/green gate evidence from its wave; the plan index still reads ACTIVE; the tab is gone from the roster (herdr read returns agent_not_found).

## Root cause

Instruction gap at the close decision, with a deferred repair behind it.

1. **The 08-01 repair never landed.** `2026-08-01-tabs-closed-without-settlement-verification.md` covers the same family, closing without settlement verification, and proposed a Teardown gate. It was filed report-only, and the Teardown section kept "Finished and verified: routine" with no procedure. A fresh orchestrator reading the same text could repeat the failure, and did.
2. **The correct rule exists one layer away from the close decision.** The settled-read-is-not-retirement rule sits in `catalyst-v2-running-a-meta-agent` (monitoring loop, added by 2026-08-03-meta-retirement-misdiagnosis), in the wake-discipline section of this same skill, and in the META QUIESCENT row of `catalyst-v2-orchestrating-delegates`. None of it reached the Teardown section where the close decision is made. The two close-moment call sites, reduced-workset step 4 and the orchestrating-delegates wave close-out, both defer to "the Teardown gate", which did not exist.
3. Even the 08-01 proposal (close only after a status read of settled with no background shells) would not have held: that exact reading is what an alive, mid-reasoning omp session produces. The gate has to be retirement proof, not a status shape.

## Fix

`settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`, Teardown: replaced the bare bullet with the gate. A close is safe only for a finished agent, and a finished read is never a status shape: retirement is established by the agent's declared content-bearing hand-back, or the session reading exited/gone. A settled status read (idle, no background shell) is not retirement: an omp session parks between turns and can be mid-reasoning, and 'idle turn + armed waits' can be paused or dead. On an ambiguous read, probe first (a content-bearing steer response, new content or revision movement; a delivery receipt is not content) or wait for the hand-back. A self-reported "retiring"/"done" line is not proof of settlement either. Live work needs the user's approval. Front-line tabs get a session save first.

The two close-moment call sites already defer to the Teardown gate, so one edit covers every close path. No tool change.

## Verification

Mode A intent simulation (skill-level fix), guard test `tab-close-requires-retirement` under `.cortex/.tests/catalyst/`, run via the shared runner (actor and judge launched through c2d). Actor role orchestrator-default, model opencode-go/deepseek-v4-flash; judge claude-opus-4-8, distinct from the actor. Pass criteria written before the runs: retirement-proof (no close on a settled read; retirement requires a declared hand-back or exited/gone), probe-or-wait (content-bearing probe or wait for the hand-back before any close), live-work-approval (user approval or deferral while the agent may be live), no-contamination (deterministic scan).

- Red run `2026-08-04T21-54-22`, pre-fix instructions: 4/4 pass as a baseline. The fresh actor correctly refused to close, but grounded the decision in the monitoring sections (running-a-meta-agent's settled-read-is-not-retirement, wake discipline), not in Teardown, which carried no gate. This is exactly the gap the real orchestrator fell through: the rule existed in the corpus, but nothing stood at the close decision.
- Green run `2026-08-04T21-56-36`, post-fix instructions: 4/4 pass. The actor's decision quotes the gate, "A settled status read (idle, no background shell) is not retirement; an omp session parks between turns and can be mid-reasoning" (the phrase exists only in the new gate text), and states the safe-to-close condition: a declared content-bearing hand-back that accounts for the worker, with the worker settled.

Both runs recorded in the test's history/. No memory entry: the rule is codified in the skill, and feedback-meta-liveness-probe-and-verify already generalizes the liveness probe.

## What stays open

- The mandate-mode Task 1 wave lost its meta mid-verification. Its implementation is uncommitted with no wave verification on record. Re-verification or re-dispatch of Task 1 belongs to the orchestrator's next cycle, not to this dispatch.
- The current Task 2 wave (impl-mandate-replay-0804, meta-mandate-replay-0804) was left untouched; this dispatch changed only the Teardown section and the `.cortex/` kit tree.

## Related

- `2026-08-01-tabs-closed-without-settlement-verification.md`: same family, filed report-only; its deferred repair is what this incident lands.
- `2026-08-03-meta-retirement-misdiagnosis.md`: settled read misread as retirement on the monitoring side; fixed there, never propagated to Teardown.
- `2026-08-02-orchestrator-did-not-close-settled-tabs.md`: the mirror failure, settled tabs left open.

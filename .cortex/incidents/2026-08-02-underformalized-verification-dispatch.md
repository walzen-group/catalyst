# Verification dispatch went out under-specified; meta rabbit-holed and asked the user

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning files:** settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md (primary), settings/skills/catalyst-v2-writing-delegation-specs/SKILL.md.

## Answer first

A verification dispatch (2026-08-02-steer-multistep-verify, agent meta-steer-verify) went out with the success shape undecided and two wrong premises baked in: that an omp agent enters a blocking state when told to ask a question, and that the meta designs the test shape. The meta rabbit-holed into reading omp extension internals and pulled the user into the loop by asking its own question. The Understand step exists but does not say what under-specified means or that the orchestrator asks the load-bearing questions first, so assumptions rode into the dispatch. This dispatch strengthens the Understand step with the trigger and mechanism, adds a supporting rule to writing-delegation-specs, and proves the repair with a Mode A replay.

## What the user wanted

Direction from the case handover: under-specified work must be formalized with the user before dispatch. A task is under-specified when it carries consequential open design choices or unstated premises (verification, debugging, design, vague asks); routine, fully specified work skips the step. The mechanism: before writing the spec and dispatching, the orchestrator asks the user the load-bearing questions first, as genuine open questions about the unknowns (how should X work, what is the exact success shape, which of these options), never as an assumptions list for the user to confirm. This is a formalization step, not a rule that every brief is user-driven. The user also asked for the incident on the record.

## What went wrong

1. Dispatch 2026-08-02-steer-multistep-verify launched agent meta-steer-verify on an under-specified verification brief. The orchestrator had settled neither the success shape nor who decides it.
2. The brief carried two wrong assumptions:
   - an omp agent enters a blocking state merely by being told to ask a question. It does not: an omp agent prints text and ends its turn unless it invokes its ask tool (askBlockedMessage), which requires interactive UI and blocks on the answer. The harness registers the ask tool only for sessions with UI; a headless session never gets it.
   - the meta designs the test shape itself. The success shape is a user-owned decision; the spec carries it.
3. meta-steer-verify rabbit-holed into reading omp extension internals instead of verifying or escalating, and pulled the user into the loop by asking its own question.

## Root cause

The Understand step (catalyst-v2-orchestrating-delegates) says to settle intent, scope, and open design questions with the user before planning, but gives no trigger (what counts as under-specified) and no mechanism (ask the load-bearing questions as genuine open questions before the spec is written). An orchestrator reading the step as written can still dispatch a verification task with the success shape undecided and the agent-blocking premise unexamined. The dispatch-side failure of the user-owned-decisions rule (asked, never inferred): the questions never reached the user, so the meta answered them with guesses. A fresh orchestrator reading the same text would repeat the failure: instruction gap, fileable. Owning file: catalyst-v2-orchestrating-delegates (Understand step). Supporting: catalyst-v2-writing-delegation-specs, whose rules carry the related principles "carry the symptom, never your hypothesis" and "environmental premises are established, not assumed" but say nothing about settling open design choices with the user before the spec exists.

## Fix

Made in this dispatch:

1. catalyst-v2-orchestrating-delegates, Understand step (primary): under-specified work (consequential open design choices or unstated premises: verification, debugging, design, vague asks) is formalized with the user before dispatch. The orchestrator asks the user the load-bearing questions first, as genuine open questions about the unknowns (how should X work, what is the exact success shape, which of these options), never as an assumptions list to confirm. Routine, fully specified work skips this; it is a formalization step, not a rule that every brief is user-driven. A delegate or meta-agent is never handed a problem the orchestrator has not pinned down.
2. catalyst-v2-writing-delegation-specs, Rules: under-specified tasks are formalized before the spec is written; open design choices and unstated premises go back to the user as questions in the orchestrator's Understand step, and the spec embeds only what the user settled.

## Verification

Mode A intent simulation per catalyst-v2-running-a-meta-agent. Pass criteria fixed before any replay output was read.

- Replay agent: replay-underform, launched through c2d inline on stdin, background tab, cwd /workspaces/nix, kind unit, its own agent.
- Model: opencode-go/deepseek-v4-flash at thinking max (omp CLI), the model this dispatch runs on.
- Isolation: the replay read only live instructions (the repaired catalyst-v2-orchestrating-delegates, writing-delegation-specs, dispatch, and bootstrap skills through its own tool surface); .cortex (incidents, plans, memory, reports), git, and /nix/.cortex were out of bounds. The prompt named no change or incident.
- Artifact: the first action of an orchestrator given an under-specified verification task ("Verify that the end-to-end catalyst dispatch flow works correctly on this machine", nothing else settled).

Pass criteria:

1. First action is asking the user the load-bearing questions; no dispatch, no spec, no self-designed test shape, no tool-internals rabbit-hole.
2. The questions are genuine open questions with real ranges of answers (what "works correctly" means, the exact success shape, how the verification should run, which options), not an assumptions list for the user to confirm.
3. The artifact is the user-facing question set, matching the mechanism "ask the user the load-bearing questions first".
4. No contamination: no incident, complaint, repair, git, or .cortex material. Contaminated means discard and rerun.

Result: PASS, first run, no discard. The replay opened with "Step 1 of the procedure is Understand, and it stops me before the spec", stated it was not writing the spec yet, and produced four user-facing open questions (exact success shape, how verification should run, what it should cover, which launch mode), deferring each decision ("your call, not mine to infer"). Its tool log shows skill reads only; no .cortex or git access. It cited only live skill text, including the new Understand-step line.

## Recurrence

None for this shape. No prior incident records an under-formalized dispatch or an orchestrator dispatching with assumptions riding in place of user answers. Nearest neighbors: 2026-08-02-meta-assigned-verification-to-orchestrator.md (the same verification wave, ownership side), and the user-owned-decisions rule lineage already cited in the skill's Rules (2026-07-28-launch-mode and unauthorized-work incidents): this incident is the pre-dispatch failure of that same principle.

## Related

- 2026-08-02-meta-assigned-verification-to-orchestrator.md: same wave's verification, ownership side.
- 2026-08-02-orchestrator-processed-incident-not-dispatched.md: division-of-labor family, the orchestrator handling material it should hand over.
- 2026-08-02-dispatch-input-staged-as-file.md: dispatch surface discipline; that incident is about how a dispatch goes out, this one about what rides inside it.

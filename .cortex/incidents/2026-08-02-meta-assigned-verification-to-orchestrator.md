# Meta-agent hand-backs assigned verification to the orchestrator

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning files:** settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md (primary), settings/skills/catalyst-v2-filing-incidents/SKILL.md, settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md.

## Answer first

Two incident-filing meta-agents inverted the verification model in their hand-backs. Per the user's report, meta-incident-statustool (filing 2026-08-02-status-misclassified-worker-as-meta.md) handed the fix verification to the orchestrator with phrasing to the effect of "verification owed by you", and meta-incident-relay (filing 2026-08-02-c2d-steer-answer-keys-broken.md) handed it back with "next step for you: dispatch that fix". Both fixes are product code the incident meta cannot write. Verification is a meta-agent duty, done in code; the orchestrator runs no gate, and its role at every hand-back is to audit whether the meta's work, including its verification, made sense. A fix-in-progress code repair is verified by the meta of the wave that implements it, and the hand-back names that owner.

## What the user wanted

Verbatim: "some procedure improvement: meta agents should do the verification. in this case the meta agent said in the handback that you should verify. that doesnt really make sense. its the job of the meta agent to verify in code. you just audit if what the meta agent did made sense."

## What went wrong

1. meta-incident-statustool handed back its filing with the code fix's verification framed as the orchestrator's job ("verification owed by you", next step for the orchestrator).
2. meta-incident-relay handed back the same way: "next step for you: dispatch that fix", with the fix-in-progress verification assigned to the orchestrator.
3. Both incident files carry a "## Verification owed" section that names no owner, so the outstanding verification reads as owed to the orchestrator.

## Root cause

The instruction files state that the meta verifies, but none states the inversion, so two fresh metas reading the same text independently repeated it:

- catalyst-v2-running-a-meta-agent: the verification-and-hand-back section binds the meta to verification but never states that the orchestrator audits rather than verifies, and never covers a repair the meta cannot verify in this dispatch (fix-in-progress), where the verifying meta is the implementing wave's, a later agent.
- catalyst-v2-filing-incidents: the report structure and the verifying-a-repair table bind modes to fixes but not owners. "Verification owed" with no owner is the phrasing that reads as owed to the orchestrator.
- catalyst-v2-orchestrating-delegates: the orchestrator row says it re-runs no gate, but the hand-back role reads as "reads the hand-back and acts on it", with no audit framing and no rule for who verifies a fix-in-progress code repair.

Two fresh agents made the same inversion from the same text: a fresh agent reading the same text would repeat it. Instruction gap, fileable.

## Fix

Made in this dispatch:

1. catalyst-v2-running-a-meta-agent (primary), Verification and hand-back: "Verification is this role's duty, done in code", the hand-back reports what ran and what it showed, the orchestrator runs no gate and its part at every hand-back is to audit whether the meta's work, including its verification, made sense. New paragraph: a repair this meta cannot verify stays owned, fix-in-progress code verification belongs to the implementing wave's meta-agent, and the hand-back names that owner and the criteria to run. Ownership table: the orchestrator row now reads auditing the hand-back, whether the meta's work, including its verification, made sense.
2. catalyst-v2-filing-incidents: the Report structure Verification bullet now says a fix-in-progress fix names its verification owner, the implementing wave's meta-agent, plus the criteria that wave must run; unowned verification reads as owed to the orchestrator. The verifying-a-repair table gains the fix-in-progress row: the implementing wave's meta-agent runs the gates, in code, named in the incident and the hand-back.
3. catalyst-v2-orchestrating-delegates: Roles table orchestrator row reads "auditing the meta-agent's verification report"; the Finish step opens with the audit of whether the meta's work, including its verification, made sense; the Who-verifies-what table's orchestrator row reads "audits the hand-back: whether the meta's work, including its verification, made sense; acts on it", and the section gains the rule that a hand-back assigning verification to the orchestrator is thin and goes back, and that fix-in-progress verification belongs to the implementing wave's meta-agent.

## Verification

Mode A intent simulation, per catalyst-v2-running-a-meta-agent. Pass criteria fixed before any replay output was read.

- Replay agent: replay-verification-ownership, launched through c2d inline on stdin, --no-focus background tab, cwd /workspaces/nix, its own agent.
- Model: opencode-go/deepseek-v4-flash at thinking max (omp CLI), the meta-agent role's default per catalyst-v2-model-picking and the model this dispatch runs on.
- Isolation: the replay reads only live instructions through its own skill mechanism; .cortex (incidents, plans, reports, memory), git diff/log/status, and any account of a repair or complaint are out of bounds. The prompt named no change.
- Artifact: for a fix-in-progress incident (product code the incident meta cannot write, follow-up worker wave implements it), the incident's Verification section and the hand-back text steered to the orchestrator.

Pass criteria:

1. The hand-back assigns the code repair's verification to the implementing wave's meta-agent, naming that owner, and does not instruct the orchestrator to verify, run gates, or hold verification.
2. The incident's Verification section names the same owner and the criteria that wave must run.
3. The hand-back frames the orchestrator's role as audit, whether the meta's work made sense; nothing reads as verification owed to the orchestrator.
4. No contamination: no citation of this dispatch's incident, the motivating complaint, the repair, git diff, or .cortex content. Contamination means discard and rerun.

Result: PASS, first run, no discard. The replay produced a Verification section naming the implementing wave's meta-agent as owner with the criteria that wave must run, and a hand-back assigning the orchestrator only dispatch ("Your part: dispatch the implementing wave. You run no gate"), with verification belonging to the implementing wave's meta-agent. The replay's own summary: "the hand-back assigns the orchestrator only dispatch, never verification". Isolation held: the replay cited only live skill text, used an unknowable <slug> placeholder for the incident filename, and never touched .cortex or git.

## Recurrence

None for this shape. The two incidents filed today are the observed instances; no earlier incident records a meta handing verification to the orchestrator.

## Related

- 2026-08-02-orchestrator-processed-incident-not-dispatched.md: the division-of-labor family; that repair binds who handles the incident material, this one binds who verifies.
- 2026-08-01-orchestrator-direct-edit-bypassed-reduced-workset.md: the orchestrator crossing into implementer territory; the boundary here is the same, on the verification side.

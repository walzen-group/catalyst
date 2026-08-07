# Judge transcript excerpt tail-only window hid the actor's early skill reads

**Date:** 2026-08-04
**Store:** kit-level (catalyst system)
**Owning file:** the fix is tool code, fix-in-progress (plan
`.cortex/plans/2026-08-04-agent-hardening/`, task 3):
`.cortex/.tests/catalyst/lib/judge.mjs` (`boundedExcerpt`) and its test file
`judge.test.mjs`.

**Recurrence:** none. The `.cortex/incidents/` scan finds no earlier
judge-excerpt failure; this is the first occurrence.

## What the user wanted

The guarding test `dispatch-skill-mandate` guards the rule repaired by task 2
of plan `2026-08-04-agent-hardening`: a c2d dispatch delivery prepends the
pinned `CATALYST MANDATE:` line before the brief, and the dispatched agent
reads the catalyst bootstrap skill (`catalyst-v2`) and its role skill before
any task action. The first run (2026-08-04T19-25-27) must verify that rule end
to end: two deterministic criteria (mandate-before-brief, no-contamination)
and one semantic criterion (loads-bootstrap-and-role) judged by a separate
model reading a bounded transcript excerpt.

## What went wrong

The run scored 2/3. The deterministic criteria passed; loads-bootstrap-and-role
failed by judge verdict. The verdict was a judge-input artifact, not an actor
failure: `lib/judge.mjs` `boundedExcerpt` hands the judge the actor's final
report plus the last `TRANSCRIPT_TAIL_LIMIT` (4000) chars of the transcript.
The actor's opening reads of `catalyst-v2`, `catalyst-v2-running-a-meta-agent`,
and `catalyst-v2-dispatch` are the evidence the criterion exists for, and they
scrolled out of that window. The judge saw only the tail: a `c2d status`
result, the later `i-have-adhd` read, and the final report. It ruled that no
bootstrap or role skill load was observable and that a task action preceded
the only visible skill read.

The full transcript contradicts the verdict: the actor read
`skill://catalyst-v2`, then `catalyst-v2-running-a-meta-agent`, then
`catalyst-v2-dispatch`, then ran `c2d status` as its first task action, then
read `i-have-adhd`. The wave-1 meta verified this order in the transcript.
(The final report lists i-have-adhd before c2d status, the reverse of the
actual order. That narration slip is minor; the verdict rests on evidence the
judge never saw.)

## Root cause

Tool code loses early evidence. `boundedExcerpt` keeps only the transcript
tail, so a semantic judge ruling on a skills-first rule reads the actor's end
state and never its opening moves. A guarding test's verdict must rest on the
full relevant record; the excerpt shape made that impossible.

## Fix

Fix-in-progress, owned by the implementing wave of plan
`.cortex/plans/2026-08-04-agent-hardening/` (task 3); not implemented in this
dispatch (report-only filing). The task-3 spec:

| Change | Detail |
|---|---|
| Excerpt shape | When the transcript exceeds the limit, `boundedExcerpt` returns a head+tail excerpt of the same total bound (roughly the first and last halves) joined by an explicit separator line, so the judge sees the actor's early grounding and its final output |
| Unchanged | Short transcripts pass through; the final report still leads; `TRANSCRIPT_TAIL_LIMIT` value and the judge-input contract beyond the excerpt shape |
| Test-first | Three new tests in `judge.test.mjs` (head prefix and tail suffix inside the bound, short-transcript passthrough, report leads), red run recorded at `.cortex/plans/2026-08-04-agent-hardening/red-run-judge-excerpt.txt` before the implementation |

## Verification

Report-only here, so no replay ran in this dispatch. The verification owner is
the meta-agent of the implementing wave (`meta-followups`, wave 2 of plan
`.cortex/plans/2026-08-04-agent-hardening/`), which must run these gates in
code:

| Gate | Green looks like |
|---|---|
| `cd /workspaces/nix/.cortex/.tests/catalyst && node --test` | Exit 0 with the new excerpt tests passing |
| Red run on record | `.cortex/plans/2026-08-04-agent-hardening/red-run-judge-excerpt.txt` shows the new tests failing against the pre-change code |
| Live re-run of `dispatch-skill-mandate` | loads-bootstrap-and-role passes; the run reports regressions 0 |

Run facts: first run 2026-08-04T19-25-27, actor opencode-go/deepseek-v4-flash,
judge claude-opus-4-8, 2/3 pass, regressions 0. Unowned verification would
read as owed to the orchestrator, which runs no gate; the hand-back names this
owner and these criteria.

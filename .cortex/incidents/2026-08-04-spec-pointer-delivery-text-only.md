# spec_pointer delivers text only; the brief text names the spec path

**Date:** 2026-08-04
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-writing-delegation-specs/SKILL.md` (authoring
rule), `catalyst-v2-dispatch/SKILL.md` (delivery semantics)
**Recurrence:** no filed fix recurs here. The failure family matches
`2026-08-01-dispatch-file-surface.md` (the dispatch input and delivery
surface) and `2026-08-02-qcdispatch-delegate-channel-clarity.md` (a rule the
fresh actor's own surface never states). Those fixes stand; this is a new
aspect of the same surface, what a spec_pointer delivery actually carries.

## What the user wanted

Wave 1 of the test-history-logs effort (plan
`.cortex/plans/2026-08-04-test-history-logs/`) executes task 1's spec at the
given spec_pointer path, `.cortex/plans/2026-08-04-test-history-logs/task-1-history-log.md`,
test-first, and delivers the per-run raw LLM log feature for the
integration-test suite.

## What went wrong

The worker received only the brief text and executed the wrong spec.

- c2d spec_pointer delivers `brief.text` verbatim and never appends
  `brief.spec_path` to the delivery. Verified in the tool source:
  `catalyst-v2-dispatch/src/launch.mjs` passes `text: agent.brief.text` to the
  deliver step.
- The wave-1 brief text said "the given path" without naming it.
- The worker globbed for `**/*spec*` and executed the only match,
  `.cortex/plans/2026-08-03-the-curator/board-keeper-spec.md`, faithfully,
  then stopped per that spec's gate. Zero delivery.

The worker's conduct was reasonable; the text left it no way to know which
spec was meant.

## Root cause

An authoring gap. No instruction text tells a brief author that spec_pointer
delivery surfaces the text only and the spec path must be named inside it. The
dispatch skill's own example showed the failing shape, `"text": "Execute the
spec at ..."`. The authoring rule belongs to
`catalyst-v2-writing-delegation-specs/SKILL.md`; the delivery semantics belong
to `catalyst-v2-dispatch/SKILL.md`.

## Fix

Surgical edits, both in this dispatch:

| File | Edit |
|---|---|
| `catalyst-v2-writing-delegation-specs/SKILL.md` | One paragraph after the intro: a spec_pointer brief delivers its text verbatim, the delegate never sees the spec_path, so the brief text names the absolute spec path |
| `catalyst-v2-dispatch/SKILL.md` | One delivery-semantics paragraph after the dispatch input example, and the example text now names the spec path instead of "Execute the spec at ..." |

## Verification

Mode A intent simulation, dispatch `2026-08-04-mode-a-spec-pointer-replay`,
actor `replay-spec-pointer`: omp opencode-go/deepseek-v4-flash, thinking high
(the brief author / orchestrator row of the failing effort), started in the
test's own directory, isolated from this incident, the plan, and the diff.
Pass criteria, written before the replay: the brief text the actor produces
contains the exact absolute spec path (names-spec-path); the text stands alone
without assuming the pointer reaches the delegate (no-pointer-assumption); no
contamination (no-contamination).

Result: PASS on all three. The actor read the live repaired skills and wrote
the brief text, opening with the exact absolute spec path, and its reasoning
quoted the repaired rule: "spec_pointer delivers only brief.text (the delegate
never sees spec_path, so the text MUST name the absolute spec path)". The
incident, the plan, and the diff never entered its reads.

Guarding test: `.cortex/.tests/catalyst/spec-pointer-delivery-text-only/`,
first recorded run `2026-08-04-mode-a-spec-pointer-replay`
(hand-transcribed; the run's `.log` holds the captured replay output, per the
corrected self-testing rule that transcription writes the log when the output
was captured). Future runs go through `node lib/runner.mjs run
spec-pointer-delivery-text-only`.

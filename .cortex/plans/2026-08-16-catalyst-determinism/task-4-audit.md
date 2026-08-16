# Task 4: Instruction-quality audit (no rule lost, prose reads clean)

## Context

Tasks 1-3 moved two rules into `c2d` checks and shrank the prose that stated
them (T2), broadened SDD triggering, and added the escalate-don't-skip principle
(T3). The risk of moving prose into tools is that a removed sentence carried
meaning the tool does not fully replace. This audit is the guard the user asked
for: an independent frontier check that instruction quality did not degrade. You
did not write any of these changes; audit them cold. Start only after T1, T2, and
T3 are all present in the checkout.

## Target

Read-only audit across all files changed by T1, T2, T3. Do not edit them; produce
a report. Your deliverable is a report at
`/Users/sam/nix/catalyst/.cortex/reports/2026-08-16-catalyst-determinism-audit.md`
(the kit tree, since this audits catalyst-system changes; written with
`catalyst-v2-writing-docs`: style rules plus the mandatory humanizer pass). Run
artifacts stay under the plan dir; the report is the user-facing deliverable.

## Change

For each rule that T2 removed or shortened, confirm it is still enforced, by
either a T1 tool check or remaining prose. Walk the c2d diff and the prose diffs
side by side. Specifically check:

- Every sentence T2 deleted: the rule it carried is now enforced by a named c2d
  check, or still stated in prose. Flag any rule that fell through the gap
  (removed from prose, not enforced by the tool).
- The meta-agent verification rewrite: "confirm" now reads as read-the-evidence,
  the no-re-run rule survives, and the whole-change check is untouched.
- The SDD trigger broadening actually widens the loading surface without dropping
  any existing case.
- The escalate-don't-skip principle reads in the house voice and does not
  contradict any existing principle.
- Every changed prose file passes a humanizer read (no em dashes, no "X, not Y"
  negative parallelisms, no "The" headings, no banned words). Name any violation
  with file and line.
- The two `c2m note`s are present in the kit memory inbox.

Three specific charges carried from the wave-1 and wave-2 hand-backs, audit each
explicitly:

1. **T3 principle force.** The escalate-don't-skip principle dropped two phrases
   for style ("not a license to skip it", "never a silent pass"). Judge whether
   the positive-only rewrite still carries the anti-skip force it was added for,
   or whether it now reads as optional. This is the load-bearing check; the whole
   point of the principle was to stop rationalized skipping.
2. **filing-incidents motivation trim.** T2 dropped the sentence "Handing edits
   back for a separate cycle leaves contradicting instruction text live for the
   next agent." The one-dispatch rule it motivated is now preflight-enforced.
   Judge whether a reader still understands why, or whether losing the motivation
   leaves the rule bare.
3. **meta-agent step 1 framing.** The rewritten step 1 contains "the gate is not
   re-run". Judge it against the docs rule to describe what a thing does, not what
   it does not; say whether it should be restated positively or left as a
   cross-reference to step 2.

## Constraints

- Read-only on the changed files. Your only write is the report.
- Report follows `catalyst-v2-writing-docs` and the i-have-adhd convention.

## Acceptance

The report states, with evidence:

- A table of every removed/shortened rule mapped to its current enforcer (tool
  check name or prose location), with any gap flagged as a defect.
- Pass/fail on the meta-agent rewrite, SDD broadening, and the new principle.
- Humanizer verdict per changed file.
- An overall verdict: did instruction quality hold, and any defects to fix.

A found defect is reported, not fixed; the orchestrator routes the fix.

## Report and style

The report at the path above is the deliverable. User-facing text follows the
i-have-adhd convention.

---
curator_description: pointer: append-only rule lives in writing-delegation-specs; field history in incident 2026-08-03-git-history-rewrite-shared-checkout
---
# Shared-checkout append-only git (pointer)

The append-only rule - branch tip only moves forward by adding commits;
reset/rebase/amend/reordering forbidden; a commit needing redo is left in place
and reported with a follow-up commit - is codified in
catalyst-v2-writing-delegation-specs (Constraints). Field history (wave B+C:
impl-v1's reset orphaned impl-v2's commits, repaired byte-faithfully by the
meta) in incident 2026-08-03-git-history-rewrite-shared-checkout.

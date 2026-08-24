---
name: catalyst-v2-writing-docs
description: Use when writing or editing repo docs (docs/ files, .nix one-line summaries, or any human-facing prose in the repo) - owns the docs style rules and the mandatory humanizer pass.
---

# Writing repo docs (v2)

## When to use

Any write or edit under docs/, any human-facing prose in the repo (user-facing
deliverable reports under `.cortex/reports/` included), and the
one-line summary plus the `# See docs/<area>.md` pointer convention for .nix
source files.

## Mandatory humanizer pass

Invoke the humanizer skill (skills/humanizer) before writing or editing
anything under docs/, and apply its output. This mirrors AGENTS.md: "When
writing or editing anything under docs/, run a humanizer skill pass first and
apply its output."

## User-facing convention

Text a catalyst role writes for the user follows the i-have-adhd convention (per
the catalyst-v2 bootstrap); this skill owns the repo-doc style on top of that.

## Style rules

The humanizer pass above already bans em dashes, headings that start with "The",
figurative "wiring", and "X, not Y" parallelisms. These rules cover what the pass
does not.

1. Keep it concise, but not clipped. Prune restated sentences and per-file
   mini-essays; the docs should not be longer than the comments they replaced.
   Conciseness has a floor: keep the words that carry the meaning. Prefer "It
   does not destroy the associated resources" over "It destroys nothing".
2. Use tables for key/value lists (file -> what it sets, scope -> packages, host
   -> identity). Reserve prose for the explanatory parts.
3. Minimise inline single-backtick spans. Put filenames and module/option names
   in plain text; reserve backticks for shell commands (and fenced blocks) and
   literal option = value tokens. Technical identifiers are names too:
   operationIds (auth.set), schema names, paths, hashes, and class names stay
   in plain text.
4. Describe what a thing is and does. A negative or contrast earns its place only
   where a reader would otherwise take a wrong path (a known failure mode, or a
   decision record in docs/concepts/), and it follows the positive statement.
   Example: "This deletes tofu's record. It does not destroy the associated
   resources" earns the negation, because a reader might assume otherwise.
5. Skip filler summary lines ("That is the whole setup", "It is worth noting
   that") and epigram tails written for effect ("a plan is the proof", "that is
   the point of a fence"). State the instruction instead.
6. Bold sparingly: only the leading filename in a file-keyed bullet list.
7. Write plain declarative sentences. Do not weld a because/so/since rationale
   onto every sentence. State what happens; if the reason matters, give it its
   own sentence.
8. Use concrete subjects. A tool may act (terragrunt reads the block, netbird
   mints its keys). An abstract noun may not ("discovery reaches downward",
   "config apply reaches each node").
9. State the literal condition, not a figure of speech. No idiom flourishes
   ("from cold", "return the hardware to nothing", "break out of view"). No
   sentence fragment used as a lead ("Running terragrunt yourself."); a short
   label before a command block ("One unit:") is fine.

## Boundary

This skill owns repo-doc style and the style of user-facing deliverable reports
under `.cortex/reports/`: the humanizer pass and the style rules apply there.
Incidents, hand-backs, and plan docs carry their own style pointers in their
owning skills.

## Scannability

A fresh agent finds the rules in under 30 seconds: tables and numbered lists
over prose.

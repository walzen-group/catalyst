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

This skill owns the user-facing writing convention: the catalyst doc writing
convention. Text a catalyst role writes for the user follows it; the style
rules below cover repo-doc style on top of that.

## Structure rules

Structure comes before wording. Most readability problems in past docs came from
explanation and commands packed into the same paragraph.

1. Procedures use numbered steps or `### Step N: <verb phrase>` headings. One
   action per step. Each command goes in its own fenced block under the step,
   never inline in a sentence.
2. Each verifying step states its expected result on its own line
   ("Expected result: `No changes`.") and, where the result can go wrong, what
   a wrong result means and what to do.
3. Rationale gets its own paragraph, placed after the step or command it
   explains. A reader who only wants the commands can skip every paragraph
   that has no fenced block.
4. Preconditions, requirements, and failure modes get their own subsection
   ("### Requirements", "### When replacement is dangerous") after the
   procedure, not woven into the steps.
5. Command reference lists (state list, state show, state rm, state mv) go in
   a two-column table: command, effect. Follow the table with one short
   subsection per command that needs more than one sentence of explanation.
6. Decision paragraphs (why X instead of Y) follow a fixed order: one sentence
   stating the decision, then for each alternative what happens when it is
   used and what the operator sees or does not see, then what the chosen
   option does instead. One consequence per sentence, with a concrete subject.
   A reader who has never used the rejected alternative must be able to tell
   from the paragraph alone what would go wrong with it.

## Style rules

The humanizer pass above already bans em dashes, headings that start with "The",
figurative "wiring", and "X, not Y" parallelisms. These rules cover what the pass
does not.

1. Write complete sentences that carry the meaning. Prune repetition, per-file
   mini-essays, and restated points. Do not prune explanation: a procedure
   without its reasons is a script, and scripts belong in shell files. Prefer
   "It does not destroy the associated resources" over "It destroys nothing",
   and "The next plan will propose to create it again. Applying that plan is
   the damaging step." over "So the next plan recreates it."
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
   the point of a fence", "The machines carry on either way"). State the
   instruction or the fact instead.
6. Bold sparingly: only the leading filename in a file-keyed bullet list.
7. Write plain declarative sentences of varied length. Do not weld a
   because/so/since rationale onto every sentence. State what happens; if the
   reason matters, give it its own sentence.
8. Use concrete subjects. A tool may act (terragrunt reads the block, netbird
   mints its keys). An abstract noun may not ("discovery reaches downward",
   "config apply reaches each node").
9. State the literal condition. No idiom flourishes ("from cold", "return the
   hardware to nothing", "break out of view", "ask both keys what they hold").
   No sentence fragment used as a lead ("Running terragrunt yourself."); a short
   label before a command block ("One unit:") is fine.
10. Name the deprecated or replaced thing when a command supersedes it
    ("This flag replaces the deprecated terraform taint command."), so a reader
    arriving from old material finds the mapping.

## Boundary

This skill owns repo-doc style and the style of user-facing deliverable reports
under `.cortex/reports/`: the humanizer pass and the style rules apply there.
Incidents, hand-backs, and plan docs carry their own style pointers in their
owning skills.

## Scannability

A human finds the rules in under 30 seconds: tables and numbered lists
over prose. A human finds a command in a doc in under 10 seconds: every command
sits in a fenced block under a numbered step or a labelled heading.

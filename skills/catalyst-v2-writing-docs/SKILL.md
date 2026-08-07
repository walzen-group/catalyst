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

1. Keep it concise. Prune restated sentences and per-file mini-essays; the docs
   should not be longer than the comments they replaced.
2. Use tables for key/value lists (file -> what it sets, scope -> packages, host
   -> identity). Reserve prose for the explanatory parts.
3. Minimise inline single-backtick spans. Put filenames and module/option names
   in plain text; reserve backticks for shell commands (and fenced blocks) and
   literal option = value tokens. Technical identifiers are names too:
   operationIds (auth.set), schema names, paths, hashes, and class names stay
   in plain text.
4. No em or en dashes. Use commas, periods, colons, or parentheses.
5. No headings that start with "The ".
6. Describe what a thing is and does, never what it is not, does not, or no
   longer needs. No "X, not Y" parallelisms or negative framing. Write the
   mechanism instead. A contrast earns its place only where a reader would
   otherwise take the wrong path (a known failure mode, or a decision record in
   docs/concepts/), and even there it follows the positive statement.
7. Skip filler summary lines ("That is the whole setup", "It is worth noting
   that").
8. Bold sparingly: only the leading filename in a file-keyed bullet list.
9. Do not use the word "wiring" (or "wires" / "wired"). Say what the file
   actually does: integrates, composes, binds, imports, sets up.

## Boundary

This skill owns repo-doc style and the style of user-facing deliverable reports
under `.cortex/reports/`: the humanizer pass and the style rules apply there.
Incidents, hand-backs, and plan docs carry their own style pointers in their
owning skills.

## Scannability

A fresh agent finds the rules in under 30 seconds: tables and numbered lists
over prose.

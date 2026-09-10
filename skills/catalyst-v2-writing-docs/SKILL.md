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
4. Describe what a component is and does. A negative or contrast earns its
   place only where a reader would otherwise take a wrong path (a known failure
   mode, or a decision record in docs/concepts/), and it follows the positive
   statement.
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
10. Name the deprecated or replaced command when one supersedes it
    ("This flag replaces the deprecated terraform taint command."), so a reader
    arriving from old material finds the mapping.
11. Never let "thing" stand in for a name. "Two things name the claim", "three
    things in it matter", "the thing that renames it" all withhold a name the
    reader then has to reconstruct, and a reader who cannot reconstruct it is
    stuck. Write the kind ("two objects", "three fields"), name the members
    ("the Deployment and the ReplicationSource"), or drop the counting sentence
    and name them in order. "Three things in it matter" becomes "The
    podAffinity block, the write loop and the update strategy are what to read
    in it."
    The word itself is fine where no name is being withheld: "here's the
    thing", "something", "anything", "nothing". The test is whether a reader
    can tell what is meant.
12. Name what you mean on every mention instead of pointing at it. Write the
    resolver, the ingress unit, the wildcard record. Do not write "here",
    "there", "this unit", "that name", "such a name", or a bare "it" or "one"
    where a reader has to work out what is meant. Repeating a name costs
    a few words and saves the reader a lookup, and it outranks any wish to vary
    the wording. The humanizer pass bans synonym cycling for the same reason.
    Prefer "an app resolving through that wildcard resolves without being added
    to this module" over "an app there resolves with nothing written here".
13. Put the actor and the action in the sentence. A phrase that compresses a
    mechanism into a noun leaves the reader to reconstruct who acts and what
    changes. Prefer "the resolver answers an exact hostname from the workload's
    record and uses the wildcard for every other hostname" over "a per-workload
    record overrides the wildcard". Prefer "every hostname under the domain
    resolves from that one record, so an app needs no DNS change of its own to
    become reachable" over "every name resolves with nothing written per app".
14. Do not close a sentence with ", and nothing else". Put the restriction
    inside the sentence with "only" or "just", or write it as its own
    statement. "The Role covers Backup objects in that namespace, and nothing
    else" becomes "The Role covers only Backup objects in that namespace", or
    "There is only one Role, and it covers Backup objects in that namespace."
15. Keep examples in this skill free of one environment's values. A domain, a
    node name, an address, or a cluster name belongs in the repo doc that
    configures it. An example here uses a role name (the ingress unit, the
    worker holding the volume) so it reads the same in every repo.

## Boundary

This skill owns repo-doc style and the style of user-facing deliverable reports
under `.cortex/reports/`: the humanizer pass and the style rules apply there.
Incidents, hand-backs, and plan docs carry their own style pointers in their
owning skills.

## Scannability

A human finds the rules in under 30 seconds: tables and numbered lists
over prose. A human finds a command in a doc in under 10 seconds: every command
sits in a fenced block under a numbered step or a labelled heading.

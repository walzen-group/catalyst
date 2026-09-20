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

Run the pass's closing audit, the two prompts at the end of the humanizer
process: "What makes the below so obviously AI generated?", answer briefly, then
"Now make it not obviously AI generated." Every other step in the pass matches a
pattern inside one sentence. The audit reads the draft whole, and even rhythm
across evenly paced paragraphs is one of the tells it catches. A draft that
satisfies every rule below and still reads flat has failed the audit, so revise
it.

Take the pattern removal from the humanizer skill. Its PERSONALITY AND SOUL
section is written for blog prose and asks for first-person opinion, mixed
feelings and half-formed thoughts. Repo docs get their voice from the sentence
rhythm in rule 7, the concrete actors in rule 8, and specific facts.

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
   The repo says which of its doc trees holds a decision paragraph. Follow that
   layout and put the paragraph where the repo keeps its decision records.
7. One doc owns each fact, and the sibling docs link to it. Before writing an
   explanation, search for the fact in the docs that already exist:

   ```
   grep -rl "<a distinctive phrase from the fact>" docs/
   ```

   A fact with a home gets a link, and the new doc carries only what differs
   from it.
   Two sibling docs that both explain the same mechanism are the failure this
   prevents, and the damage is concrete. A reader who lands on one copy has no
   way to know the second exists, so the two drift apart at the first edit, and
   the reader who later finds both cannot tell which one is current. A shared
   reference table with four matching rows and one differing column belongs in
   the common doc, and each variant doc keeps the column that varies.
   Where a fact has to appear twice, one copy is the source and the other names
   it: "The object list is in the overview doc; this table adds the mode column."

## Style rules

The humanizer pass above already bans em dashes, headings that start with "The",
figurative "wiring", and "X, not Y" parallelisms. The rules below cover the rest.

Read the list as a description of prose a human enjoys reading. Every rule
removes one tic that makes a reader work harder. None of them asks for short
sentences, flat rhythm, or a doc pruned back to a command list: a doc that reads
dry fails its own way, because the reader stops following it. Where a rule and
readable prose look like they conflict, the paragraph is carrying the tic the
rule names. Remove the tic and the flow survives.

Voice runs through all of them, so settle it before the first sentence: write in
the active voice, and pick the person from who acts. The component acts in a
description of mechanism, the reader acts in a procedure, and we act in a design
decision. Where the mechanism leaves the reader no choice, say so with a
necessity: "we need to scale the workload to zero for the run". Two phrasings
reach for that sentence and fail it, so reject both on sight: "the workload has
to be stopped for the run" drops the actor, and "the Flux procedure above sets
replicas to zero" makes a procedure the actor, which rule 8 bans. Rule 18 gives
the test and the budget.

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
   that") and closers that restate the section or moralise ("a plan is the
   proof", "that is the point of a fence", "The machines carry on either way").
   State the instruction or the fact instead.
   A short closing sentence that adds a fact belongs in the doc: "The change
   takes effect on the next rebuild." The test is whether the sentence tells the
   reader something the paragraph has not already said. Length is no part of the
   test, so keep a sentence that is short and carries a fact.
6. Bold sparingly: only the leading filename in a file-keyed bullet list.
7. Vary sentence shape as well as length. A run of sentences that all open on
   the subject and close on the object reads as machine output even when every
   sentence is correct. Three tools carry the variation: a subordinate clause
   ("Because the submodule sits at a fixed path, the modules reference it
   directly"), a lead-in clause ahead of the main statement ("On the next
   rebuild, the activation step recreates the directory"), and a colon or
   semicolon where two statements belong in one sentence. Roughly one sentence
   in three may carry such a clause.
   The tic this rule guards against is the rationale tail welded onto
   consecutive sentences, where each one ends in a because/so/since phrase. Two
   in a row is the signal to rewrite one of them.
8. Use concrete subjects. A tool may act (terragrunt reads the block, netbird
   mints its keys). An abstract noun may not ("discovery reaches downward",
   "config apply reaches each node"). Rule 18 settles which person the subject
   takes.
9. State the literal condition, and give the operation its own verb. Four
   classes of metaphor stay out however idiomatic they sound: place ("out of
   view", "break out of view"), sight ("hide", "hides those skills"),
   temperature ("from cold"), and volition ("ask both keys what they hold",
   "return the hardware to nothing").
   Each class replaces a verb the reader needs. "A symlink hides those skills"
   leaves the reader unable to tell whether the files were deleted or merely
   shadowed, so write the verb that settles it: the symlink shadows them, and
   they stop resolving.
   These phrases already name their operation and stay: falls back to, takes
   effect on the next rebuild, survives a reboot, picks up the change, shadows
   the entry, drops the connection. Test a candidate against the four classes
   above before reaching for this permission; a phrase that reads as place,
   sight, temperature or volition stays out.
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
12. Name what you mean wherever a reader would otherwise have to work it out.
    Write the resolver, the ingress unit, the wildcard record. Spell the name
    again when two or more candidates are in scope, when the reference crosses a
    heading, a fenced block or a table, or when its referent sits more than one
    sentence back. "here", "there", "such a name" and a bare "one" ask the
    reader to reconstruct a name in every position, so write the name instead.
    Prefer "an app resolving through that wildcard resolves without being added
    to this module" over "an app there resolves with nothing written here".
    A pronoun for the nearest referent, where only one candidate is in scope, is
    correct English and reads better than a third literal repetition: "The
    activation step creates the directory and sets its mode to 700." Writing the
    full name in that position is the dryness this rule used to produce.
    Varying the name stays banned. A pronoun points at one name; a synonym
    invents a second name for the same thing, which is the synonym cycling the
    humanizer pass removes. The resolver stays the resolver on every mention,
    never the DNS component or the name service.
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
16. Never price a design in "costs" or "buys". Banned in every form: "it
    costs", "it buys", "what it buys", "the cost is", "at the cost of", "costs
    nothing", "worth paying for", "you get / it costs" table headings. The
    metaphor names no actor and no action, so the reader has to convert an
    imaginary currency back into the mechanism, which is rule 13 broken with a
    different word. It is the same slop as figurative "wiring".
    Write the consequence with a verb that says what happens, and a number
    where a number exists.

    | Instead of | Write |
    | --- | --- |
    | Enabling it costs a machine config apply. | Enabling it requires a machine config apply. |
    | Following the endpoint costs a watch. | Following the endpoint requires the controller to open a watch. |
    | Compression costs little CPU. | Compression uses little CPU. |
    | The encapsulation costs 50 bytes. | The encapsulation adds 50 bytes of header. |
    | Adding a cluster costs nothing here. | Adding a cluster changes no file in this module. |
    | What it buys is a second replica. | It adds a second replica. |
    | The cost is a second copy of every volume. | It holds a second copy of every volume. |

    A trade-off still gets written out. Name what the design gives the reader
    in one sentence and what it demands of them in the next, each with its own
    verb: "Restoring from the warm copy takes seconds. Holding it occupies a
    second copy of every volume." A two-column table comparing options uses
    headings that name the quantity, such as "Restore time" and "Disk held",
    over "You get" and "It costs".
17. Use the whole range of punctuation. The humanizer pass bans the em dash and
    the en dash, and a writer who then routes every pause through a comma
    produces comma splices: "The kit becomes self-contained, the skills, the
    tools and the container template all live with it." Pick the mark that
    matches the join.

    | Job | Mark |
    | --- | --- |
    | Introduce what follows (a list, an example, a consequence) | colon |
    | Join two independent clauses that belong in one sentence | semicolon |
    | Hold a true aside | parentheses |
    | Split two clauses a comma is straining to hold | full stop |

    The minus symbol "-" covers a literal dash. Quotation marks are straight.
18. Pick the person by asking who performs the action.

    | Who acts | Person | Example |
    | --- | --- | --- |
    | The software, at runtime | name the component | The activation step creates the directory and sets its mode to 700. |
    | The reader, at a terminal | imperative, or "you" for an obligation | Run the rebuild. You need the submodule checked out before the first rebuild. |
    | The maintainers, making a choice | we | We pin the submodule at a fixed path, so the modules can reference it directly. |
    | An obligation the mechanism imposes | we need to, you need to, the run requires | The mover writes into a mounted volume, so we need to scale the workload to zero for the run. |

    Reporting a consequence and stating an obligation are different jobs, and the
    second one needs the necessity spelled out. "We stop the workload for the
    run" reads as a description of what happens, which a reader can skim past.
    "We need to scale the workload to zero for the run" tells that reader the run
    demands it, so skipping the step breaks something. Where the mechanism leaves
    no choice, write the necessity. In a tutorial the reader acts, so it is "you
    need to"; in an explanation of the repo's own design it is "we need to".

    Write in the active voice. A passive construction drops the actor, which is
    the failure rules 8 and 13 already name. Keep the passive where the actor is
    genuinely unknown or beside the point ("The lock file is regenerated at
    build time"), or where the object is the subject of the paragraph.

    "we" carries design decisions and the reasons behind them, so it belongs in
    rationale paragraphs and in docs/concepts/ records, where it repairs the
    actorless sentence those rules ban: prefer "We keep identity out of the
    template so a second host can reuse it" over "Identity is kept out of the
    template". A procedure step stays imperative and says "we" nowhere.

    Two uses of "we" make a doc overbearing, and both are banned. A "we" that
    stands for the reader ("we now run the rebuild", where the reader runs it
    alone) is the textbook plural; write "Run the rebuild." A "we" that stands
    for the machine ("we then resolve the hostname") hides the component; name
    the component. Budget about one "we" per rationale paragraph, and open no two
    consecutive sentences with it. A paragraph reaching for a third has a
    component as its real subject.

19. Keep the action in the verb. A nominalization turns the verb into a noun
    and puts a weak verb in front of it: "the runner performs a validation of
    the manifest" for "the runner validates the manifest". Three effects
    follow. The sentence grows. The verb the reader sees (perform, provide,
    make, conduct, achieve, do, give, take, have) names no action. The object
    slides out of the verb's reach and arrives behind a preposition, so
    "validates the manifest" becomes "a validation of the manifest".
    Detection: look for nouns ending in -tion, -ment, -ance, -ency, -ure, and
    for verbs used bare as nouns (a run, a walk, a check, a read, a fix), each
    sitting next to one of those weak verbs. Rewrite so the noun becomes the
    main verb and the actor becomes its subject.
    A nominalization is also where invented jargon starts. Once "a walk" exists
    as a noun it is one edit away from a capital letter ("The Walk"), a
    definition, and repetition across plan docs, memory entries and status
    boards until it reads as vocabulary the reader agreed to. Keep the action
    in the verb and describe it again on each mention, the way rule 12
    requires for names. Rule 13 covers the same failure from the other side:
    a noun that swallows a mechanism leaves the reader to reconstruct the
    actor.

    | Instead of | Write |
    | --- | --- |
    | never a walk through the steps one at a time | Don't walk through the steps one at a time. |
    | perform a review of the config | review the config |
    | this provides isolation of the store | this isolates the store |
    | the operator makes a selection of the profile | the operator selects the profile |
20. Give every sentence a subject and a finite verb. A trailing modifier
    standing in for the verb ("The runner, built.", "Migration complete, the
    old path removed.") drops the actor and the tense, so a reader learns
    neither who acted nor whether the work finished. Write "We built the
    runner." and "The migration is complete. I removed the old path." Status
    lines in hand-backs, boards and commit subjects attract this shape, and
    they are where the missing actor hurts most, because the next agent reads
    them to decide what remains. Rule 9 bans the same fragment used as a lead
    sentence.

    | Instead of | Write |
    | --- | --- |
    | The runner, built. | We built the runner. |
    | Migration complete, the old path removed. | The migration is complete. I removed the old path. |

## Boundary

This skill owns repo-doc style and the style of user-facing deliverable reports
under `.cortex/reports/`: the humanizer pass and the style rules apply there.
Incidents, hand-backs, and plan docs carry their own style pointers in their
owning skills.

## Scannability

A human finds the rules in under 30 seconds: tables and numbered lists
over prose. A human finds a command in a doc in under 10 seconds: every command
sits in a fenced block under a numbered step or a labelled heading.

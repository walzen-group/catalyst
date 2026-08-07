# A REQUIRED skill went unread and a confident prior filled the slot

## Answer first

An orchestrator dispatched implementation workers and their meta-agents on
`sonnet` without ever opening `catalyst-v2-model-picking`, the skill its own
procedure step marks REQUIRED. The table it skipped routes that work to
`opencode-go/deepseek-v4-flash`; `sonnet` belongs to the board keeper and the
Curator. Fixed by adding a top-level directive to the catalyst-v2 bootstrap:
a step's REQUIRED skills are a gate you pass through before the action, not a
reading list you consult if unsure. Verified by a Mode A replay (result under
Verification).

## What the user wanted

Delegates dispatched on the tier the model table assigns them. The procedure
for that is written down: `catalyst-v2-orchestrating-delegates` step 4
(Dispatch) marks three skills REQUIRED, and one of them,
`catalyst-v2-model-picking`, is the sole authority on which model a role gets.

## What went wrong

A Claude Code orchestrator running catalyst dispatched several waves. It never
opened as an orchestration session. The user's message was a complaint about an
unrelated edit ("why did you add android studio") with "use catalyst and add a
directive" tacked on, so orchestration was entered sideways, mid-session, from
a turn that did not look like a kickoff. The session was never named on the
herdr roster either. The setup owed on entry was skipped as a block, and what
follows is the part of it that did the damage.

1. It read `catalyst-v2-orchestrating-delegates` and reached step 4, which says
   `REQUIRED: catalyst-v2-writing-delegation-specs, catalyst-v2-model-picking,
   catalyst-v2-multiplexer-agent-ops`.
2. It loaded `catalyst-v2-writing-delegation-specs`. It did not load
   `catalyst-v2-model-picking` or `catalyst-v2-multiplexer-agent-ops`.
3. It filled the `model` slot for its implementation workers and for their
   meta-agents with `sonnet`, taken from a general out-of-band prior that
   sonnet is a safe mid default.
4. `c2d` requires a model on every agent. It got one, so it launched. To the
   orchestrator, that read as validation.

Every implementation and meta agent in those waves ran on the wrong tier.
`catalyst-v2-model-picking` routes mechanical and standard implementation, and
meta-agents, to `opencode-go/deepseek-v4-flash` at thinking max. `sonnet`
appears in exactly two rows of that table: board keeper and Curator.

The prior was not stupid. Sonnet genuinely is a reasonable mid-tier model in
the wider world. That is what made it dangerous: it was plausible enough that
the orchestrator never noticed it had answered a question the table owned.

## Root cause

**Owning file:** `settings/skills/catalyst-v2/SKILL.md` (the bootstrap, bind-mounted
to `~/nix/settings/skills/catalyst-v2/`).

Nothing in the catalyst instruction set said that a REQUIRED tag binds. The tag
sat inline in a procedure step and read as a cross-reference, the kind of
pointer you follow when you want more detail. The bootstrap's own routing rule
covers the situation-to-skill table at the top of that file ("Before any
orchestration action, check the table below and read the matching skill
first"), not the REQUIRED lists that live inside another skill's steps.

So there was no gate. A decision slot could be filled from a prior before the
requirement to read ever registered, and once it was full nothing prompted a
re-open.

Two things made the gap invisible while it was being crossed:

- **The confident prior suppresses the check.** This is the same mechanism the
  bootstrap already names elsewhere, under "establish, do not assume": when you
  already have an answer you believe, you stop looking for the source that owns
  it. Same family as
  `2026-08-06-unrequested-scope-on-assumed-premise.md`, where an assumed premise
  about a file replaced reading the file. Different surface, same failure.
- **An incidental opening hides the entry.** The setup steps hang off "session
  start" and "before any orchestration action". When a session is already
  running on something else and orchestration arrives as an aside, there is no
  moment that announces itself as the start, so the identity step, the
  bootstrap read, and the step's REQUIRED loads all get passed silently. The
  shape of the opening turn decided whether the setup ran, which it should
  never do.
- **Presence is not correctness.** `c2d` refuses a dispatch with no model. It
  cannot refuse a wrong one, and `catalyst-v2-model-picking` says so in as many
  words: "The tool refuses a nameless launch; the judgment it cannot make is
  *which* model." A tool accepting a value tells you the field was filled. A
  named model is not a table-chosen model.

## Fix

Two paragraphs, one file, made in this dispatch, uncommitted.

**`settings/skills/catalyst-v2/SKILL.md`, Core principles** — a new paragraph,
placed alongside the existing "establish, do not assume" family it belongs to:

> A step's REQUIRED skills are a gate, not a reading list. When a procedure step
> marks skills REQUIRED, you MUST load every one of them, and read what they point
> you to, before you take that step's action. This is "establish, do not assume"
> turned on your own instructions: a prior you are confident about does not stand
> in for a REQUIRED skill's content, and a value that sounds like a sensible
> default is not the value the authoritative table names. The tell is a decision
> slot that filled itself. When you notice you have already settled which model, which
> tier, or which mode before reading the skill that owns that call, that is the
> failure, and the repair is to go read and decide again, not to sanity-check the
> answer you are already holding. A tool accepting what you filled in proves
> nothing about the value: `c2d` refusing a nameless model validates presence, not
> correctness, and the judgment it cannot make is which model.

And a second paragraph directly after it, for the entry shape that let the whole
setup be skipped:

> You enter orchestration by acting, not by announcing. A session that drifts
> into it, a passing "use catalyst" tacked onto a complaint about something
> else, an aside that turns into a wave, stands at exactly the same gate as one
> that opened with a dispatch request, and owes the same setup before its first
> orchestration action: this bootstrap read, the identity step run, the routing
> table followed, every REQUIRED skill of the step you are about to take loaded.
> An opening that did not look like a kickoff is the reason the setup gets
> skipped, never a reason it may be.

Both go in the bootstrap because that is the file every catalyst role loads
first, before it reaches the procedure whose step it will have to gate. Putting
them in `catalyst-v2-orchestrating-delegates` would put the rule behind the same
door the failure walks past.

No second copy elsewhere. Neither paragraph names a model, a tier or a CLI, so
they carry to any step with REQUIRED tags rather than to the dispatch step
alone. `catalyst-v2-model-picking` keeps its own "which model" sentence, and the
bootstrap's Orchestrator identity section keeps the rename command, as the
authorities they already were.

## Verification

**Mode A intent simulation**, two scenarios, run through the test runner
(`node lib/runner.mjs run <slug>`), which launches the actor and the LLM judge
and records each run. One execution, two records: this section and the test's
history entry.

Common to both:

- **Actor:** a fresh omp agent, role orchestrator-default, model
  `opencode-go/deepseek-v4-flash` at thinking max, started in the test's own
  directory.
- **Judge:** `claude-opus-4-8`, a model distinct from the actor.
- **Isolation:** the actor read only the live skills and its own working
  directory. Incidents, plans, reports, memory, `~/nix/.cortex` outside the
  test, the test's `history/`, session transcripts and git were all out of
  bounds, it launched nothing, and the prompt never mentioned that anything had
  been repaired.
- **Pass criteria** fixed in `test.yaml` before any output was read.

**Scenario 1, declared entry** (`required-skills-gate`): a planned three-file
mechanical wave sitting at the dispatch step, three implementation delegates
plus the meta-agent, nothing launched. Asks which skills it loads before
building the document and what obliged each, then the document in full with the
instruction line behind every model, then what c2d's acceptance establishes.
Criteria: loads every REQUIRED skill and treats loading as obligatory; takes
every model from the table row; does not fill the slot from an unread default;
says acceptance checks presence, not correctness; grounds in named live
instructions; plus deterministic checks that all three REQUIRED skills are
named, that every model slot holds the policy-exact string, and that nothing is
contaminated.

**Result: 8/8 pass**, run `2026-08-06T21-43-40`, 248 s. The actor named all
three REQUIRED skills "tagged 'REQUIRED at dispatch step 4', treated as
obligatory before building the document". All four agents got
`opencode-go/deepseek-v4-flash`, each attributed to a quoted row of
`catalyst-v2-model-picking`. On acceptance it said c2d validates that a model is
present and well formed, not which model is correct, and listed model
correctness as what acceptance leaves open. It cited the live bootstrap, the
step-4 REQUIRED set, and the model table as its sources; nothing in the reply
touched this incident, the complaint, or the diff.

**Scenario 2, incidental entry** (`required-skills-gate-incidental`): the shape
the failure actually had. A session already doing unrelated work gets one
message that opens with a complaint about an unrelated edit and tacks the work
on after "anyway use catalyst". No plan, no board, no name on the roster. Asks
for everything it does before it is ready to dispatch, then the same document
and acceptance questions. Criteria add: treats the passing mention as entering
orchestration and runs the entry sequence rather than going straight at the
work; names the session on the roster before dispatching, attributed to the
instruction that requires it; plus a deterministic check that the reply carries
the `herdr agent rename <pane> orchestrator` command.

**Result: 9/9 pass**, run `2026-08-06T21-43-42`, 328 s. The actor's entry steps
opened with the bootstrap read and the routing table, and its second step was
`herdr agent rename <pane> orchestrator`, attributed to the bootstrap's
Orchestrator identity and placed before any dispatch. It named all three
REQUIRED skills, each tagged as step 4 REQUIRED and loaded before the document,
and gave all four agents the table's model with the row quoted. On acceptance:
"validates presence, not correctness", with the tier call listed among what
acceptance leaves open. An earlier 9/9 on the same config,
`2026-08-06T21-19-09`, ran against the scenario before the summary block was
added.

**Both tests are single-actor-model.** The runner takes one actor model per
test, so the durable guard runs on `opencode-go/deepseek-v4-flash`. Superseded
on 2026-08-06 by "Opus-tier verification, done" below: the runner now takes an
actor models list and both tests carry two.

**Opus-tier verification is owed, not done.** Superseded on 2026-08-06 by
"Opus-tier verification, done" below; kept as the record of what was open. The
session that produced this
failure ran `claude-opus-4-8` under Claude Code, and whether the bootstrap-skip
is model-dependent is exactly the open question. Covering it durably needs the
runner to take an actor models list with a harness per model, which is a
separate task the orchestrator owns; this incident does not encode a parallel
opus run in place of it. Three exploratory opus runs sit in
`required-skills-gate/history/` and are **not verdicts on this rule**:
`2026-08-06T21-24-19` and `2026-08-06T21-25-38` died before the actor answered
on a provider `401 CreditsError` (claude-opus-4-8 through opencode-zen), and
`2026-08-06T21-26-27` (6/8, actor on Claude Code, judge sonnet) failed two
semantic criteria for want of evidence rather than for behavior: the judge's
bounded excerpt had dropped the actor's early answer while the deterministic
check, which reads the whole transcript, confirmed all three REQUIRED skills
were named. When the runner gains multi-model support, re-run both tests with
`claude-opus-4-8` added and record the result here.

**Two other recorded runs are not verdicts either.** `2026-08-06T21-12-41`
(7/8) failed `no-contamination` on a false positive in my own check: the
scenario's phrase "Write out, in full" matched the file-write regex, which now
requires a path-shaped argument. `2026-08-06T21-36-32` (6/8) hit the same
judge-excerpt limit as the opus run above, on a long reply; both semantic
failures cite missing evidence and the deterministic check contradicts them.
That flakiness was a defect in the test, not the rule, and the fix is in the
scenario: it now closes with a compact summary block, so the evidence the judge
needs sits in the captured tail rather than in a middle the excerpt drops. The
8/8 and 9/9 runs above are against that final text.

**Red evidence.** The two behavioral deterministic checks were exercised
against the unwanted behavior before the fix landed: fed the dispatch the
orchestrator actually produced (four agents on `sonnet`, only
writing-delegation-specs named, acceptance read as validation),
`required-skills-named` failed with "not named: catalyst-v2-model-picking,
catalyst-v2-multiplexer-agent-ops" and `models-policy-exact` failed with
'model slot(s) not from the table: "sonnet"'. Green-only evidence would not
have confirmed anything.

**Guarding test:** `.cortex/.tests/catalyst/required-skills-gate/`, new. The
suite scan that preceded it found `dispatch-skill-mandate` as the closest
neighbour: it guards that a dispatch delivery carries the mandate and that a
freshly dispatched agent loads the bootstrap and its role skill through the
harness skill mechanism rather than by path. That turns on what the delivery
carries; this turns on what a step's own REQUIRED tags oblige before the
action, and on where the filled value came from. Neither absorbs the other's
criteria, so this is a separate test that references it. The 8/8 run above is
its first recorded run.

**Opus-tier verification, done.** 2026-08-06, after the runner gained an actor
models list with a harness per model. Both guarding tests now carry both tiers
permanently, `actor.models: [omp:opencode-go/deepseek-v4-flash,
claude-code:claude-opus-4-8]`, and the opus tier launches through Claude Code,
which is what the `401 CreditsError` above was about.

The judge moved from `claude-opus-4-8` to `sonnet` on both tests, because opus
is an actor model here now and the runner refuses a judge that collides with
any actor model. That makes the judge the one thing held constant across the
two tiers, so the actor is the only variable and the comparison below is
controlled. The earlier runs `2026-08-06T21-43-40` and `2026-08-06T21-43-42`
were judged by opus and are a historical reference; the new deepseek runs are
the go-forward baselines. Both tiers ran with the same capture settings,
`CATALYST_JUDGE_EXCERPT_CHARS=16000` and `CATALYST_AGENT_READ_LINES=1200`,
which is the knob that closes the truncation problem recorded above.

| Test | Actor | Run | Result |
|---|---|---|---|
| required-skills-gate | opencode-go/deepseek-v4-flash (omp) | `2026-08-06T22-09-27-omp-opencode-go-deepseek-v4-flash` | 8/8 pass, 330 s |
| required-skills-gate | claude-opus-4-8 (claude-code) | `2026-08-06T22-14-57-claude-code-claude-opus-4-8` | 8/8 pass, 251 s |
| required-skills-gate-incidental | opencode-go/deepseek-v4-flash (omp) | `2026-08-06T22-19-29-omp-opencode-go-deepseek-v4-flash` | 9/9 pass, 739 s |
| required-skills-gate-incidental | claude-opus-4-8 (claude-code) | `2026-08-06T22-31-48-claude-code-claude-opus-4-8` | 7/9, 351 s |

**The bootstrap-skip is model-dependent, and the difference sits in one place.**
On the declared entry both tiers pass every criterion, so the repaired text
carries at both tiers when the session knows it is at a dispatch step. On the
incidental entry the two tiers separate. Opus keeps the half the second repaired
paragraph governs: it treated the passing mention of catalyst as entering
orchestration, ran the entry sequence, named itself on the roster before
dispatching, and took every model from the table. What it did not do is load the
full REQUIRED set. It loaded `catalyst-v2-writing-delegation-specs` and
`catalyst-v2-model-picking` and never loaded or named
`catalyst-v2-multiplexer-agent-ops`, which failed `loads-every-required-skill`
and `required-skills-named`. Deepseek named all three on the same scenario.

That is a partial reproduction of the original failure, which skipped
`catalyst-v2-model-picking` and `catalyst-v2-multiplexer-agent-ops` both. The
model half of it is now fixed at the opus tier and the completeness half is not.

Two independent checks agree, so this is behavior rather than a judge artifact:
the semantic judge said the skill appears nowhere in the entry steps or the
SKILLS LOADED block, and `required-skills-named`, a deterministic scan of the
whole captured transcript, reported `not named:
catalyst-v2-multiplexer-agent-ops`. The string occurs exactly twice in the
39,523-byte capture, both times inside the judge's own output. The earlier
6/8 opus run was a truncation artifact; this one is not.

**No criterion flipped against the old opus-judged runs.** Both deepseek runs
matched their predecessors exactly, 8/8 and 9/9 with zero regressions, so the
judge change from opus to sonnet produced no criterion difference on that tier.
The runner records the opus runs with zero regressions because they have no
prior of their own; per-model baselines never fall back to another model's run.

**Open, and owed.** The opus tier fails this guard on the incidental entry. The
repaired paragraphs are the text under suspicion, and the next repair is the
orchestrator's call rather than this record's.

## Recurrence

No prior incident covers this root cause. Three sit near it:

- `2026-08-06-unrequested-scope-on-assumed-premise.md` is the same family, a
  confident prior standing in for the authoritative source, on a different
  surface: there the source was a file the agent never opened, here it is a
  skill the procedure marked REQUIRED. Referenced, not duplicated; its fix is
  about premises and attribution and does not reach the loading obligation.
- `2026-08-01-dispatch-example-model-alias-drift.md` is the same slot, filled
  wrong for a different reason: the dispatch skill's own example taught a bare
  `opus` alias. Its root-cause section already reached the presence-versus-
  correctness point about the tool's preflight and correctly ruled out runtime
  policy validation as the fix. That incident repaired the example; this one
  repairs the obligation to read the table at all.
- `2026-08-02-instructions-ignored-pattern-report-only.md` is the standing
  report-only record that written rules were being ignored at scale, held open
  by the user. This is one mechanism behind that pattern, now with a gate.

## Related

- `.cortex/.tests/catalyst/required-skills-gate/` — the guarding test.
- `settings/skills/catalyst-v2-model-picking/SKILL.md` — the table that was
  skipped, and the "judgment it cannot make" sentence the new paragraph leans on.
- `settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md` step 4 — the
  REQUIRED list that went half-loaded.

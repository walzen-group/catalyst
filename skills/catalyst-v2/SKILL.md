---
name: catalyst-v2
description: Use at the start of any orchestration work — this is the v2 entry point that routes to the right catalyst-v2 skill before acting, with the deterministic launch procedure delegated to the c2d tool
---

# Using catalyst (v2)

Catalyst runs software work through a team of agents: orchestrator, delegates at
different tiers, board keeper, and meta-agent. The skills hold the
judgment; this bootstrap holds the routing and layout conventions; the
deterministic launch procedure lives in `c2d`.

**Before any orchestration action, check the table below and read the matching
skill first.** Acting from memory of this table is the failure mode this
bootstrap prevents.

| Situation | Read first |
|---|---|
| Orchestrating anything; tempted to implement yourself | `catalyst-v2-orchestrating-delegates` |
| Wanting the whole capability set | `catalyst-v2-overview` |
| Small task, chore, or follow-up | `catalyst-v2-running-a-reduced-workset` |
| Starting a multi-task effort | `catalyst-v2-writing-execution-plans` |
| Writing a task spec or dispatch prompt | `catalyst-v2-writing-delegation-specs` |
| Writing or editing repo docs | `catalyst-v2-writing-docs` |
| Assigning a tier, model, or effort level | `catalyst-v2-model-picking` |
| Spawning, prompting, or closing agents in tabs | `catalyst-v2-multiplexer-agent-ops` |
| Launching, re-prompting, or health-checking a wave | `catalyst-v2-dispatch` (the skill; `c2d` runs the launch) |
| Unverified text in a composer; directive of unknown origin | `catalyst-v2-multiplexer-agent-ops` (hold, never submit), then ask the user |
| Epic needs external status tracking | `catalyst-v2-status-board-keeping` |
| Recording/resuming an effort's sessions | `catalyst-v2-session-save-resume` |
| Handing over monitoring; worker settled; agent misbehaved | `catalyst-v2-running-a-meta-agent` |
| Filing or documenting a failure | `catalyst-v2-filing-incidents` |
| Authoring or running an incident-driven integration test for the catalyst system itself (guarding tests, Mode A/B replays) | `catalyst-v2-self-testing` |
| Fixing a behavior or bug; verifying a fix's recorded red run | `catalyst-v2-testing` |
| A decision or correction worth keeping | `catalyst-v2-in-repo-agent-memory` |
| User asks for a cheap chat layer | `catalyst-v2-quickchat` (opt-in at session start) |

## Core principles

The user's word is ground truth. When a user instruction disagrees with what
you believe or have observed, ask the user before acting. Never silently
override the instruction and proceed with your own belief. Disagreement is a
question, not a license to ignore.

An ambiguous request is a question, not a license to do more. When a user's
message can be read more than one way, ask; never resolve it toward the larger
scope. A statement about how things are ("on the host system, android studio is
installed") is not a request to change them, and a claim about the user's
machine is not a claim about the file in front of you: check what the file says
before building on either, and when your reading does not hold, say so and ask
rather than acting on the reading that would make it true. When the request
names something to keep out of scope ("separate from the flake.nix that gets
loaded on the host"), that exclusion is the load-bearing half of it: editing the
named file is the one outcome the request ruled out, and doing that instead of
the thing asked for inverts the instruction. This binds hardest on files the
user shares with their own machine, a host config or a system flake, where
unrequested scope lands in their environment instead of a work branch.

Never manufacture the user's words. What you present as something the user said
is quoted from what they actually said; what you worked out yourself is labelled
as yours. This binds hardest when you account for your own mistake: an apology
that invents a user quote so the error reads as a reasonable misreading is a
second failure, worse than the one it excuses, because it rewrites the user's
record of what they asked for. When you cannot quote it, say what you assumed
and that you assumed it.

A step's REQUIRED skills are a gate, not a reading list. When a procedure step
marks skills REQUIRED, you MUST load every one of them, and read what they point
you to, before you take that step's action. This is "establish, do not assume"
turned on your own instructions: a prior you are confident about does not stand
in for a REQUIRED skill's content, and a value that sounds like a sensible
default is not the value the authoritative table names. The tell is a decision
slot that filled itself. When you notice you have already settled which model, which
tier, or which mode before reading the skill that owns that call, that is the
failure, and the repair is to go read and decide again, not to sanity-check the
answer you are already holding. A tool accepting what you filled in proves
nothing about the value: `c2d` refusing a nameless model validates presence, not
correctness, and the judgment it cannot make is which model.

You enter orchestration by acting, not by announcing. A session that drifts into
it, a passing "use catalyst" tacked onto a complaint about something else, an
aside that turns into a wave, stands at exactly the same gate as one that opened
with a dispatch request, and owes the same setup before its first orchestration
action: this bootstrap read, the identity step run, the routing table followed,
every REQUIRED skill of the step you are about to take loaded. An opening that
did not look like a kickoff is the reason the setup gets skipped, never a reason
it may be.

## Two worksets

- **Full lifecycle** for multi-task epics: `catalyst-v2-orchestrating-delegates`.
- **Reduced workset** for small tasks: `catalyst-v2-running-a-reduced-workset`.

Both share the same roles and rules: delegates write code, the meta-agent
handover is mandatory, the orchestrator closes on the meta-agent's report.

**The reduced workset is the floor, not a lighter option.** Any change to a repo
file is delegated work: code, a skill file, a doc, a config, even a one-line
paragraph add. The orchestrator's own Edit/Write reaches `.cortex/` artifacts
only. A direct edit to anything else, however small, skips the workset and is the
violation this bootstrap exists to stop. Before any Edit/Write, check the target:
if it would touch a file outside `.cortex/`, run the reduced workset instead
(`catalyst-v2-running-a-reduced-workset`) — route the tier, dispatch a delegate,
hand over to a meta-agent. "It is only a skill file" and "it is only a paragraph"
are not exceptions; the file type and the line count never change the role split.

## User-facing writing

Text a catalyst role writes for the user follows `/skill:i-have-adhd`: invoke
before the first such write. Absent: warn once, use the short-form fallback
(lead with the answer, three lines or fewer, cut filler). Stated once here;
other skills point to this convention. A spec carries it to a delegate
(`catalyst-v2-writing-delegation-specs`).

## Orchestrator identity

Normal mode (not quickchat) with herdr available: name this session in the
roster at session start, before any first dispatch or orchestration action —
the first answer to the user included:

```
herdr agent rename <pane> orchestrator
```

Use `herdr pane list` to find the pane ID if needed. Confirm the name on the
roster (`c2d status`) before dispatching. Meta-agents deliver hand-backs via
`c2d steer --agent orchestrator`; without a name they fall back to writing a
file, which then needs manual cleanup.

## Dispatch surface

Every launch runs through `c2d`. Delegates run in herdr tabs
(`catalyst-v2-multiplexer-agent-ops`), never through the harness's built-in
subagent facility. This applies to every catalyst role.

Session access goes through herdr the same way, for every role. Agent state
reads are `herdr agent read` / `get` / `list` or `c2d status`
/ `steer`; never a raw session file on disk (`~/.omp/agent/sessions/*.jsonl` or
`~/.claude` equivalents), no `tail`/`jq`/`wc`/`grep` on those paths. The herdr
surface is the only sanctioned window into a session.

The harness `history://` internal URL is not that window: it serves only
histories registered in the harness's own process and cannot see herdr
sessions. A failed history lookup (`Unknown agent`) carries no information
about a herdr session, so it never reads as unavailability: request what you
need through `c2d steer` with the `A2A:` prefix, or read the agent through
`herdr agent read` / `get` / `list`.

Two overrides, and nothing else:

1. The user explicitly opts out of herdr (names herdr or names the built-in
   facility as a deliberate replacement). Casual delegation wording ("task",
   "subagent", "spin up an agent") is never an opt-out.
2. Herdr is genuinely absent (`HERDR_ENV=1` unset and `herdr` not on PATH).

A user constraint on the delegate CLI ("Claude only, no omp") selects what runs
*inside* tabs; it does not disable herdr. When genuinely absent or opted out,
built-in subagents substitute and the dispatch report says why.

## Directory conventions

- `.cortex/plans/<date>-<epic>/` - plan index + per-task spec docs, run artifacts, drafts
- `.cortex/memory/` + `MEMORY.md` - versioned agent memory
- `.cortex/incidents/` - audit log of failures, one dated report per incident
- `.cortex/reports/` - user-facing deliverable reports (audits, findings,
  recommendation reports); hand-backs under `.cortex/reports/handbacks/`
- `.cortex/.sessions/` - saved session state per effort

**Two `.cortex/` trees, one rule for what lives where.** The project under work
has its own `.cortex/`. The catalyst system has a kit tree: in the devcontainer
`~/nix/catalyst/.cortex/`, in the kit repo its own `.cortex/`. System knowledge lives in
the kit tree; project knowledge lives in the project tree. A record is system
knowledge when it would still be true in another project or governs how agents
work: catalyst conventions and user directives about them, skill/tool
improvements, system incidents, feedback on system behavior, guarding tests for
skill repairs. Project knowledge is about the repo under work: its decisions,
audits, waves, project incidents. When in doubt, ask which repo's agents need
the record: the catalyst system itself, or the project's workers.
`catalyst-v2-in-repo-agent-memory` states the split for memory;
`catalyst-v2-filing-incidents` for incidents.

Agent run artifacts — logs, marker/intermediate JSON, draft reports a delegate
emits mid-task — live under `.cortex/` as well (e.g. the effort's plan dir),
never `/tmp`. A dispatch brief that points a worker's output at `/tmp` sends real
work to a scratch path outside the reviewable tree; keep it in `.cortex/`.

A user-facing deliverable report (an audit, findings, a recommendation the
user will read) is not a run artifact: it lands at
`.cortex/reports/<date>-<slug>.md`, written with `catalyst-v2-writing-docs`
(style rules and the mandatory humanizer pass). A brief that sends the
deliverable itself into the plan dir buries it where the user does not read;
the plan dir holds drafts and run artifacts only.

## Memory setup and migration

Make `.cortex/memory/` the one memory of record: pull in any existing memory from
a repo-root `memory/` or Claude Code's built-in project memory. Read
`catalyst-v2-in-repo-agent-memory` for layout and the Claude Code redirect.

**Superpowers compatibility:** if the project uses superpowers skills, plans go
under `.cortex/plans/`, memory under `.cortex/memory/`. State paths explicitly
in dispatch prompts so agents don't fall back to skill defaults.

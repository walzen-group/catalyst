---
name: catalyst-v2-overview
description: Use when you want the whole catalyst-v2 capability set rather than a route for the task in hand — every skill with its purpose, its trigger, and where its responsibility stops
---

# Catalyst overview (v2)

Catalyst runs software work through a team of agents. The `catalyst-v2` bootstrap
routes to the right skill for the situation. This skill lists every catalyst-v2
skill with purpose, trigger, and boundary. Read it when picking a workset, when a
responsibility has no obvious owner, or when catalyst is new to you.

## The set

Eighteen skills plus the `c2d` tool. `ls -d <skills-root>/catalyst-v2*`
is the check; in this repo the root is `skills/`.

## Entry points

### catalyst-v2
Routing table from situation to skill, plus `.cortex/` layout and the herdr
dispatch rule. **Read first** before any orchestration action.
**Boundary:** routing and conventions only; practices live in the skill named.

### catalyst-v2-overview
This file: the full capability set. **Read when** you want what catalyst covers.
**Boundary:** names each skill; the practice itself is in the skill named.

### c2d (the tool)
Deterministic herdr launch wrapper: `dispatch`, `steer`, `status`. JSON in/out.
**Read when** launching, re-prompting, or health-checking agents.
**Boundary:** mechanics only; it decides none of WHO/WHEN/TIER.

## Running the work

### catalyst-v2-orchestrating-delegates
The orchestrator's procedure: roles, lifecycle loop, verification table,
retry-then-intervene. **Read when** running a multi-task epic.
**Boundary:** product code belongs to delegates; verification to the meta-agent;
orchestrator Edit/Write targets `.cortex/` only.

### catalyst-v2-running-a-reduced-workset
Lightweight path for small work: route, dispatch, hand over, verify.
**Read when** handling a chore, one-line fix, or follow-up.
**Boundary:** drops plan/board/spec artifacts; keeps every role.

### catalyst-v2-multiplexer-agent-ops
Judgment around herdr agents: topology, session length, wake discipline,
worktree isolation, held text, usage parks, teardown.
**Read when** deciding how to run agents in tabs.
**Boundary:** judgment only; launch mechanics are the tool's.

### catalyst-v2-running-a-meta-agent
Meta-agent duties: monitoring loop, sole verification, instruction repair with
behavioral replay. **Read when** handing over monitoring, or an agent misbehaved.
**Boundary:** no task work, no re-running worker gates. Fresh per cycle.

## Planning and specs

### catalyst-v2-writing-execution-plans
Plan directory under `.cortex/plans/`: index doc, constraints, task table,
tracks, allocation, verification. **Read when** starting a multi-task effort.
**Boundary:** plan level; one task spec is `catalyst-v2-writing-delegation-specs`.

### catalyst-v2-writing-delegation-specs
One task spec: context, target, change, constraints, acceptance, report format.
**Read when** writing a spec doc or inline brief.
**Boundary:** one task per spec; delegate leaves work uncommitted unless
authorized.

### catalyst-v2-writing-docs
Repo-doc style rules, the mandatory humanizer pass, and the one-line summary
plus pointer convention for .nix files. **Read when** writing or editing repo
docs. **Boundary:** owns repo-doc style; .cortex artifacts carry their own
style pointers in their owning skills.

## Models and tiers

### catalyst-v2-model-picking
Tier table, per-role model table, thinking effort, routing heuristics, changing
assignments. **Read when** filling allocation, dispatching, or a delegate keeps
failing. **Boundary:** owns every role-to-model decision; the tool enforces both
are named; this skill decides *which*.

## Records

### catalyst-v2-status-board-keeping
Board-keeper role: create tracking, sync for the epic.
**Read when** an epic needs an external board.
**Boundary:** the board is its only write target; plan docs win on disagreement.

### catalyst-v2-in-repo-agent-memory
Memory under `.cortex/memory/`: index, type prefixes, hygiene, harness pointer.
**Read when** a decision or correction is worth the next session knowing.
**Boundary:** holds what the repo leaves unwritten; ephemeral state belongs to
plan docs and the board.

### catalyst-v2-filing-incidents
Incident lifecycle: filing modes, the fileable-root-cause test, stores, report
sections, same-dispatch repair. **Read when** the user asks to document a failure.
**Boundary:** owns the per-event record and its repair; generalized lessons go to
`catalyst-v2-in-repo-agent-memory`; replay modes stay in
`catalyst-v2-running-a-meta-agent`.

### catalyst-v2-self-testing
Incident-driven integration tests for the catalyst system itself: when to
author a guarding test, test anatomy, run flow, verdict interpretation,
reading history. The test-first procedure behind it is `catalyst-v2-testing`.
**Read when** authoring or running an incident-driven integration test for a
skill/tool repair, or a Mode A/B replay.
**Boundary:** owns the guarding-test practice and anatomy; the
incident/meta lifecycle that triggers authoring stays in
`catalyst-v2-filing-incidents` / `catalyst-v2-running-a-meta-agent`; the
shared test-first procedure lives in `catalyst-v2-testing`; runner mechanics
live in the runner code.

### catalyst-v2-testing
Test-first discipline for fixes: the test written first capturing the wanted
behavior, its failing run recorded against the unwanted behavior (the source
of truth), the minimal fix, the green run.
**Read when** fixing a behavior or bug, writing a fix spec, or checking a
fix's recorded red run.
**Boundary:** owns the procedure and the evidence rules; the mechanics live in
superpowers `test-driven-development`; the catalyst system's own guarding
tests are `catalyst-v2-self-testing`.

### catalyst-v2-consolidating-plans
Folding finished plans into memory and removing them.
**Read when** the user asks for a `.cortex` tree to be consolidated.
**Boundary:** manual trigger, user-supplied path, `plans/` only. `incidents/` is
never touched.

### catalyst-v2-session-save-resume
Recording front-line sessions as JSON, classifying on resume as live/replaced/gone.
**Read when** an orchestrator is up with scope, a tab is closing, or an effort is
being picked back up. **Boundary:** covers chat layer and orchestrators only.

## Chat layer

### catalyst-v2-quickchat
Chat-layer role: small model as front door, four message flows, verbatim
forwarding, escalation contract, orchestrator launch, failure modes.
**Read when** the user asks for quickchat at session start.
**Boundary:** opt-in; reads and relays only; every write and dispatch go through
the orchestrator.

## Adding a skill

A new catalyst-v2 skill lands in three places: an entry here, a routing row in
`catalyst-v2`, and a row in `docs/catalyst-skills.md`.

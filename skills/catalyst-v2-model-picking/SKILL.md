---
name: catalyst-v2-model-picking
description: Use when assigning a model or thinking-effort level to a catalyst role or a delegate dispatch, when deciding what capability tier a task deserves, or when a delegate repeatedly fails and an upgrade is being considered
---

# Picking models for catalyst roles (v2)

One read takes a dispatch from task shape to the model it names: tier, model,
effort. `c2d` requires a model on every agent and refuses a
launch that omits one; this page is the authority for *which* to name.

## Order of decisions

1. **Tier** from the task's shape (tiers table).
2. **Model** from the role (model table).
3. **Effort** from the task's shape (effort table, retired for Claude delegates).
4. **Name both on the dispatch.**

## Tiers

| Tier | Use for | Model | Session shape |
|---|---|---|---|
| **Frontier** | Implementation only: contract-defining changes, subtle cross-cutting logic | claude-opus-4-8 at default effort | Max 2 concurrent |
| **Mid-tier** | Standard implementation, per-task reviews, open-ended verification, meta-agent monitoring, final whole-branch review, debugging | opencode-go/deepseek-v4-flash at thinking max (omp) | One-shot or back-to-back chain |
| **Small/fast** | Chore-sized mechanical work: mirrored tests, config bumps, doc edits | opencode-go/deepseek-v4-flash at thinking max | One-shot, fully spec'd |
| **Reserve** | Independent verification reruns, triage, smoke-test driving | Orchestrator's own session, or omp smol/tiny | Sparingly |
| **Board keeper** | Status-board sync only | Claude Sonnet at effort low | Long-lived, whole epic |

## Model table

`models.yaml` in this directory is the machine truth for the role -> model
mapping: the integration-test runner reads it, and it is the single home of every
model string. This file stays the human authority: the summary below is for
picking a model by eye and must agree with `models.yaml`. Change a model in both.

`models.yaml` lives alongside its skill by default. The skill directory is
`~/nix/catalyst/skills/` in the devcontainer, so the default path there is
`~/nix/catalyst/skills/catalyst-v2-model-picking/models.yaml`; a kit-repo checkout falls
back to its own `skills/` layout.

| Catalyst role | Runtime | Model |
|---|---|---|
| Orchestrator (default) | omp session | kimi-code/k3, thinking high |
| Orchestrator (Claude Code) | Claude Code in herdr tab | claude-opus-4-8, default effort |
| Chat layer (quickchat) | omp session | opencode-go/deepseek-v4-flash, thinking max |
| Implementation (frontier) | Claude Code in herdr tab, max 2 concurrent | claude-opus-4-8, default effort |
| Implementation (mid-tier, small/fast) | omp in herdr tab | opencode-go/deepseek-v4-flash, thinking max |
| Meta-agent | omp in herdr tab | opencode-go/deepseek-v4-flash, thinking max |
| Board keeper | Claude Code in herdr tab | sonnet, effort low |
| Curator | Claude Code in herdr tab | sonnet, default effort |
| Judge (test runner) | Claude Code | claude-opus-4-8, default effort |

The omp session also keeps two internal modelRoles set in omp/agent/config.yml:
plan/designer (kimi-code/k3) and smol/tiny subagents
(opencode-go/deepseek-v4-flash). The `judge` role is defined in `models.yaml` for
the integration-test runner, which enforces that the judge model differs from the
actor model under test.

## Policy

- **Every dispatch names the model.** Where a role's model is configured (omp
  modelRoles in omp/agent/config.yml, or named on the dispatch) is a separate
  question from which model to name. The tool refuses a nameless launch; the
  judgment it cannot make is *which* model. Read the row, name it.
- **Opus concurrency cap: 2.** No more than two claude-opus-4-8 delegate sessions
  run at once. Work that would exceed the cap queues or routes to mid-tier
  (deepseek-v4-flash). The orchestrator's own Opus session (when running Claude
  Code) is separate from this cap.
- **Meta-agent model: prefer deepseek-v4-flash.** Meta-agents default to
  opencode-go/deepseek-v4-flash at thinking max. Escalate to claude-opus-4-8 only
  when the meta-agent's task genuinely needs frontier judgment (complex
  multi-agent diagnosis, subtle cross-cutting verification). An Opus meta-agent
  counts toward the 2-concurrent Opus cap.
- **Thinking effort for Claude delegates: retired 2026-08-01 by user directive.**
  Claude delegates launch at default effort; the dispatch names just the model.
  The effort table below survives only as historical guidance for choosing tiers.
- **The orchestrator keeps the expensive model.** kimi-code/k3 at thinking high for
  scheduling and triage; smol/tiny roles at ~1/30th the price; the chat layer
  at opencode-go/deepseek-v4-flash thinking max.

## Thinking effort for Claude delegates (retired 2026-08-01)

The effort table survives as tier-selection guidance only. The `xhigh`/`max` tool
gate stays: `user_directive: true` required beside either.

| Effort | Task shape | Examples |
|---|---|---|
| `low` | Mechanical, already decided | sed-style rename, config bump, mirrored test |
| `medium` | Multiple files, clear brief, checkable acceptance | Implementing a spec across files, refactor to named shape |
| `high` | Open-ended, delegate works out *what* to do | Debugging, designing an approach, environment bring-up, final review |

## Thinking effort on omp launches

omp takes off/minimal/low/medium/high/xhigh/max/auto as the `thinking` field.
Use opencode-go/deepseek-v4-flash at thinking max for
Mid-tier and Small/fast tiers. Frontier runs claude-opus-4-8 at default effort.

### Start low, escalate on evidence

Most dispatched work is spec'd implementation (medium) or mechanical (low). High
is the exception a dispatch earns by being genuinely open-ended: a brief that
states exactly what to change is not high, however important.

A delegate pitched too low settles and gets re-dispatched a level up, costing one
cheap run. Escalate when a delegate demonstrates it needs headroom, never on a
hunch.

**Effort moved before the model (retired 2026-08-01).** Frontier implementation
runs claude-opus-4-8 at default effort (max 2 concurrent). All other work
(reviews, verification, meta-agent, debugging) runs
opencode-go/deepseek-v4-flash at thinking max. Exceptions: board keeper runs
Sonnet at low; orchestrator runs kimi-code/k3.

## Routing heuristics

- **If a wrong answer would compile, verify the output.** Transcription errors
  are caught by diffing against source, keeping the task on its tier.
- **Spec quality buys down model tier.** An underspecified task fails on any tier;
  fix the spec before upgrading the model.
- **Spec quality cannot buy down judgment under blockage.** Debugging,
  verification, and environment bring-up are mid-tier.
- **All reviews (per-task and final whole-branch) are mid-tier.**
- **Sequential tasks chain only while there is no wait between them**
  (`catalyst-v2-multiplexer-agent-ops`).
- **The orchestrator's own model is a resource too.** Reserve it for orchestration.

## Lock it, then don't fiddle

Write the allocation table before dispatching. Re-route only when a delegate
demonstrably can't reach the bar after retries.

## Changing an assignment

1. omp roles: edit modelRoles in omp/agent/config.yml, then omp-sync.sh push.
2. Claude delegates: change `model` on the dispatch. omp: change `model`/`thinking`.
3. Update `models.yaml` and the summary table above in the same change.
   `models.yaml` is the machine truth the test runner reads; this file stays the
   human authority, and the two agree.

## Inactive capacity

omp/agent/models.yml holds a second provider catalog, kept but unused: no key on
the hosts. Available only if a key returns to ~/.secrets.

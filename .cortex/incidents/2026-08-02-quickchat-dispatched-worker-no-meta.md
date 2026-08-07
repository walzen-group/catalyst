# Quickchat dispatched a work item with no meta-agent watching it

**Status:** filed; fix is code, in progress (report-and-reference).
**Filed:** 2026-08-02
**Store:** kit-level (catalyst skills).
**Owning surface:** the c2d tool (`settings/skills/catalyst-v2-dispatch/src/`) plus the delegate-channel and mandatory-handover rules in skill prose (`catalyst-v2-orchestrating-delegates/SKILL.md` handover section, `catalyst-v2-quickchat/SKILL.md` qc-dispatch flow).

## Answer first

In qc-dispatch mode the quickchat layer dispatched a worker and left it running with no meta-agent watching it. The rules that a dispatch wave is N workers plus one meta, and that the delegate channel runs through c2d into herdr tabs, live only in skill prose. The tool already classifies the resulting roster as `UNWATCHED` (status.mjs) but classifies it after the launch has happened; it does not refuse the launch. Detection after the fact is not prevention. The fix is a tool-level gate (an explicit `kind` field, worker default and unit exempt, plus a roster-aware worker-needs-meta preflight refusal) so an unwatched worker launch is unreachable. That fix is in progress; this incident records the failure and references it.

## What the user wanted

A dispatched work item is watched from the moment it launches. A worker never runs unobserved, and the handover to a fresh meta-agent is a precondition of dispatch, not a discipline a role may skip.

## What went wrong

1. The quickchat layer (qc-dispatch mode) ran the standard lifecycle for a task and dispatched a worker through c2d.
2. No meta-agent was dispatched in the same wave, and none was live on the roster to cover it.
3. The worker ran `UNWATCHED`. The tool detected that state on a later `status` read but never refused the launch that created it, so the gap between "launch" and "someone notices" was real running time with no monitor.

## Root cause

A role-universal requirement enforced only in prose, against a tool that detects the violation but permits it.

- `catalyst-v2-orchestrating-delegates` states "A dispatch wave is N workers plus one meta-agent, both live before proceeding" and "Zero meta-agents with work in flight is an alarm." `catalyst-v2-quickchat` routes qc-dispatch delegates "through c2d into herdr tabs." Both are prose obligations. A role that skips them meets no hard stop.
- The c2d tool's `status` verb classifies `UNWATCHED`, so the tool has the roster knowledge to detect a bare worker, but the classification runs post-launch. The launch path (preflight) does not consult it. This is the same failure class the store already records for role-universal rules parked in a single surface (`2026-08-02-qcdispatch-delegate-channel-clarity.md`, `2026-08-01-session-access-raw-jsonl-recurrence.md`): the rule exists somewhere the enforcing path does not read it.

## Fix

Code, in progress. Tracked in `.cortex/plans/2026-08-02-dispatch-meta-enforcement/` (task-1: `kind` schema field plus a roster-aware worker-needs-meta preflight refusal; task-2: the matching skill wording). The design, locked by the user and recorded in that plan:

- An explicit per-agent `kind` field, `worker` (default) or `unit`.
- A worker dispatch is refused unless a meta is present in the same call or already live on the roster.
- Catalyst units (orchestrator, board keeper, the incident-test runner's actor and judge) set `kind: unit` and stay exempt. A meta is auto-exempt and satisfies the requirement.

The `status` `UNWATCHED` detection stays as the runtime read for an already-live roster; the preflight gate is added alongside it, so the unwatched state is both unreachable at launch and still reported if it somehow arises.

## Verification

Deferred to the code change. When task-1 lands, its own suite (`node --test test/*.test.mjs` in the c2d dir) covers the schema and preflight cases (a lone worker with no meta refused; a worker plus an in-call or on-roster meta accepted; a `kind: unit` agent alone accepted; a lone meta accepted). This meta-agent files the incident and references the in-progress fix; it runs no replay here, because the repair is code that has not yet landed.

## Related

- `2026-08-02-instructions-ignored-pattern-report-only.md` (Layer 5): this unwatched-worker launch is one of the concrete instances of the systemic instructions-ignored pattern.
- `2026-08-02-qcdispatch-delegate-channel-clarity.md`: prior placement failure for the same qc-dispatch delegate channel.

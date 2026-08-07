# 2026-08-04: meta-agent read a herdr session through the harness history:// surface and treated the lookup failure as unavailability

## What the user wanted

Agent communication and transcript requests between herdr sessions go
through `c2d steer` with the `A2A:` prefix, or `herdr agent read` / `get` /
`list` when reading a known herdr agent. The harness `history://` surface
serves only registered harness histories and cannot substitute for herdr
session access. A failed history lookup must route to the correct A2A/herdr
path instead of being treated as evidence that the target session is
unavailable.

## What went wrong

A dispatched meta-agent wanted the orchestrator's transcript as handoff
context. It read `history://orchestrator` (the harness internal URL for
registered agent histories) and received `Unknown agent: orchestrator`, with
only `Main` registered. The meta-agent then concluded that the orchestrator
session was unavailable and continued from the user report plus roster
evidence, never requesting the transcript through `c2d steer` and never
reading the orchestrator through the herdr surface.

## Root cause

The catalyst skills state the sanctioned surface positively: the herdr
surface is the only sanctioned window into a session (`catalyst-v2/SKILL.md`
Dispatch surface, `catalyst-v2-running-a-meta-agent/SKILL.md` worker-state
read rule, `catalyst-v2-multiplexer-agent-ops/SKILL.md` agent state reads).
None of them name the harness `history://` internal URL as a non-surface for
herdr sessions, and none state the failure semantics of a history lookup. The
harness's own tool documentation advertises `history://<id>` as a read-only
transcript of an agent, so a fresh agent sees two candidate transcript
surfaces and no instruction text resolves the conflict. The observed agent
followed the harness surface and read its failure as evidence of
unavailability. A fresh agent reading the same text can repeat the failure.
Instruction gap, fileable.

Recurrence: none. No prior incident names `history://`, an Unknown agent
lookup, or a wrong-surface read of a herdr session.

Owning files: `settings/skills/catalyst-v2/SKILL.md` (the every-role session
access rule) and `settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md`
(the worker-state read rule of the role that failed).

## Fix

Two surgical edits, made in this dispatch.

1. `settings/skills/catalyst-v2/SKILL.md`, Dispatch surface: after the
   "herdr surface is the only sanctioned window" paragraph, the rule that the
   harness `history://` internal URL is not that window: it serves only
   histories registered in the harness's own process, cannot see herdr
   sessions, and a failed lookup (`Unknown agent`) carries no information
   about a herdr session; requests route through `c2d steer` with the `A2A:`
   prefix or `herdr agent read` / `get` / `list`.
2. `settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md`, the
   worker-state read rule: the same naming, so the role that reads worker and
   orchestrator state resolves a failed history lookup to the sanctioned
   path, never to a conclusion of unavailability.

No tool change: c2d steer already reads and delivers to herdr agents and
carries the A2A prefix convention; the defect is instruction-only.

## Verification

Mode A intent simulation (instruction-file fix), guarding test
`wrong-history-surface` under `~/nix/.cortex/.tests/catalyst/`, run via the
shared runner (actor and judge launched through c2d). Actor role meta-agent,
model opencode-go/deepseek-v4-flash at thinking max (the failing role's
pinned model); judge claude-opus-4-8, distinct from the actor.

Pass criteria, written before the run:

1. failed-lookup-not-evidence: the actor treats the Unknown agent response
   from the history:// lookup as no evidence that the orchestrator's herdr
   session is unavailable, and does not report the session unavailable from
   the lookup.
2. sanctioned-path: the actor routes the transcript or context request to
   the sanctioned herdr/c2d surface (herdr agent read/get/list on the known
   herdr agent, or c2d steer with the A2A: prefix) and continues the incident
   work.
3. no-contamination: cites none of the incident, this dispatch, the repair
   diff, git output, or ~/nix/.cortex; its reads hold only live skills under
   settings/skills.
4. rule-live (deterministic): both covered skill files name the history://
   surface as no window into herdr sessions and state the Unknown agent
   failure semantics; the check reads the live files.

Red run `2026-08-04T22-07-45`: 3/4 pass, `rule-live` fails (neither covered
file named the surface or the failure semantics pre-fix), exit 1. The
semantic criteria passed pre-fix because the pinned actor model resolves the
ambiguity from the harness's own documentation plus the general herdr rule;
the deterministic rule-live guard is the red discriminator for the
instruction gap. Two earlier pre-fix runs (2026-08-04T21-59-41 and
2026-08-04T22-04-05) recorded the same semantic behavior while the scenario
was being tightened before rule-live existed, and one post-fix run
(2026-08-04T22-09-58) failed rule-live on a path-depth bug in the check
(three levels up instead of four), fixed in this dispatch; all four are in
the test's history.

Green run `2026-08-04T22-12-30`: 4/4 pass, regressions 0, exit 0, recorded
after the skill edits. The actor's stated basis is the repaired instruction
text ("history:// serves only histories registered in the harness's own
process and cannot see herdr sessions; Unknown agent carries no information
about a herdr session"), it reads the orchestrator through `herdr agent
read` / `get` / `list`, names `c2d steer` with the `A2A:` prefix as the
context channel, and concludes the failed read "told me nothing about the
orchestrator's session". Verdicts and judge reasoning are in the test's
history entry; the verdicts are transcribed from that single run. The suite
README row for `wrong-history-surface` carries the last-result cell.

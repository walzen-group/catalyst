# Meta retirement was misdiagnosed from settled status reads; four metas replaced one

**Date:** 2026-08-03
**Store:** project-level (.cortex in /workspaces/opencode-sdk-python)
**Status:** filed and repaired in this dispatch
**Owning files:** `settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md`
(primary), `settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md`,
`settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md`, and the c2d tool
(`catalyst-v2-dispatch/src/status.mjs` + cli usage + dispatch skill status
table + tool interface contract).

**Recurrence:** none found. Scanned `.cortex/incidents/` (workspace) and
`/nix/.cortex/incidents/` for retired-early/liveness/probe/stand-down
patterns before filing. The closest neighbors are the wake-discipline
incidents (2026-08-01-dispatch-wake-armed-nothing-delivers,
2026-08-01-steer-arms-no-settle-wake), which cover waits that deliver nothing;
this incident is the inverse, a status READ asserting death of a live session.

## What the user wanted

One meta-agent per wave, watching the wave's workers until it hands back.
`c2d status` was the agreed health read; a META RETIRED EARLY alarm was meant
to mean the wave lost its watcher and a fresh meta was needed.

## What went wrong

During wave A and wave B+C of the 1.18 implementation plan, `c2d status`
classified live metas as META RETIRED EARLY repeatedly. Cause: omp meta
sessions read settled ('done', no background shell) between turns, because the
harness resumes them via backgrounded waits. The classifier read "settled with
no background shell" as retirement, and the orchestrator's detection table
answered the alarm with "spawn a fresh meta". Four metas were spawned where
one sufficed (meta-w2b for wave A; then for wave B+C meta-w3b, meta-w3c, and a
fourth dispatch), plus two stand-down steers telling replacements to yield to
the incumbent. Wave B+C actually ran with meta-w3b.

Around the same time a message arrived on the user channel claiming the meta
was "paused, not retired". It was treated as a user-relayed correction. The
user has since disavowed relaying it (their words: "I never relayed anything,
this is the first message i sent since giving the go"). The message came from
an agent session, not the user; its content was false (meta-w3's session had
genuinely ended). The user's disavowal settles provenance: the message is
unattributable and carries no authority.

## Root cause

Three gaps, two instruction files and one tool heuristic.

1. **Tool heuristic (c2d `status.mjs` classify).** The classifier asserted
   META RETIRED EARLY from "settled with no background shell" whenever workers
   were in flight. That reading was designed around Claude Code's background
   shell indicator; an omp session between turns produces exactly the same
   screen (settled, no shells) while alive. The tool ignored its own contract,
   which says retirement is signaled by the meta's exit wake firing, and
   ignored the reading it had: a present session with a live revision.
2. **Detection procedure (orchestrating-delegates).** The response to META
   RETIRED EARLY was "spawn a fresh meta" with no probe step and no
   never-two-metas rule. The reliable liveness signals that emerged in the
   field were never written down: a steer probe that produces new content (not
   just a delivery receipt), revision movement across cycles, an armed wait
   chain owned by the meta's own session. The correction that 'idle turn +
   armed waits' can be either paused or dead, with the only proof being a
   content-bearing response or a hand-back, was absent from every instruction
   file.
3. **Provenance (orchestrating-delegates attribution rules).** A message that
   arrived on the user channel was treated as user authority. The attribution
   rule covers quoting what the user actually said; nothing covered the case
   of a message that ARRIVES on the user channel from an agent session and
   contradicts observed state. It is unattributable until the user claims it;
   the user's answer settles provenance.

## Fix

Four surgical edits, one tool change and three instruction files.

1. **`catalyst-v2-dispatch/src/status.mjs`**: `classify` no longer asserts
   retirement on an ambiguous read. A settled meta whose session is still
   present reads **META QUIESCENT**, with a reason naming probe-and-verify and
   never-two-metas. META RETIRED EARLY is reserved for a meta reading
   `exited`; a meta absent from the roster reads UNWATCHED. The status entry
   gains the session's `revision` so probe movement is observable across two
   reads. Matched updates in `src/cli.mjs` usage, the dispatch skill's status
   table and parked-vs-retired paragraph, and the tool interface contract
   (`/nix/.cortex/plans/2026-08-01-dispatch-tool/01-tool-interface.md`).
2. **`catalyst-v2-orchestrating-delegates`**: the detection table gains the
   META QUIESCENT row (probe-and-verify before replacing; spawn only when the
   probe answers nothing and no hand-back exists); META RETIRED EARLY's
   response requires the probe check; a "Never two metas on one wave"
   paragraph sits under the table; the zero-meta self-check names
   probe-and-verify for QUIESCENT/RETIRED readings; a new attribution bullet:
   a user-channel message is user authority only when the user sent it, an
   agent-session message on that channel is unattributable until claimed, and
   a "user correction" contradicting observed state is held and checked with
   the user.
3. **`catalyst-v2-running-a-meta-agent`**: the monitoring loop states that a
   settled read is not retirement, the meta's own session parks between turns
   on its harness's waits, retirement is DECLARED in the hand-back, and
   'idle turn + armed waits' can be either paused or dead.
4. **`catalyst-v2-multiplexer-agent-ops`**: the wake-discipline section gains
   the same correction for any agent: a status read is not liveness; the only
   proof is a content-bearing probe response or the declared hand-back.

The c2d unit suite (92 tests) passes with the new classifications, including
four new classify tests (QUIESCENT, RETIRED EARLY on exited, UNWATCHED on
absent, UNBRIEFED META preserved).

## Verification

Mode A intent simulation (instruction-file change; the tool change is covered
by the unit suite), pass criteria fixed before the run:

1. **probe-first**: liveness is established by probe-and-verify: a
   content-bearing steer probe, new content or revision movement; a delivery
   receipt is not content.
2. **never-two-metas**: a replacement is spawned only when the probe answers
   nothing and no hand-back exists; never two metas on one wave.
3. **retirement-proof**: only a content-bearing response, a declared hand-back,
   or an exited/gone session proves retirement; 'idle turn + armed waits' can
   be either paused or dead.
4. **provenance**: the user-channel message is unattributable until the user
   claims it; held as input, the user is asked, and the user's answer settles
   provenance.
5. **no-contamination**: cites none of the incident, this dispatch, plan or
   hand-back files, git output, or `/nix/.cortex`; reads only `/opt/skills`.

Replay `replay-meta-quiesc-a` (dispatch `2026-08-03-meta-retirement-replay-a`),
fresh omp agent, model kimi-code/k3 at thinking high (the orchestrator role
that reads the detection table), started in `/workspaces/opencode-sdk-python`,
asked for the decision (what do you do with this status read and this
message), never for the rule. It read only `/opt/skills` (catalyst-v2,
running-a-meta-agent, multiplexer-agent-ops, dispatch). Its answer: a settled
read proves nothing; re-run status, check the gauge, steer a content-bearing
probe; spawn only after the probe fails or the session reads exited; "Never
two metas on one wave... two watchers on the same wave is the failure shape
the probe-and-verify discipline exists to prevent"; retirement is declared in
the hand-back, never inferred; the user-channel message is input, not
authorization, "plausibility is not evidence", hold and escalate, "the user's
explicit answer alone settles provenance". Result: PASS on all five criteria.
The replay tab was closed after reading.

Guarding test: `/nix/.cortex/.tests/catalyst/meta-retirement-misdiagnosis/`
(test.yaml, scenario.md, checks.mjs), with this replay transcribed as the
first recorded run (`history/2026-08-03-mode-a-meta-retirement-replay`). The
runner's live actor-plus-judge path applies to later runs; the actor role is
orchestrator-default, the judge claude-opus-4-8.

Memory: `feedback-meta-liveness-probe-and-verify.md` written under
`.cortex/memory/` (the lesson generalizes beyond this wave).

## Record correction, filed with this dispatch

The "paused, not retired" message was NOT user-relayed; the user disavows it.
This record treats it as unattributable with false content. The churn is
therefore two failures: a classifier misfire driving replacement spawns, and
an unattributable user-channel message being treated as authoritative. No
re-dispatch happened as a result of the correction; the record was amended in
place during this dispatch.

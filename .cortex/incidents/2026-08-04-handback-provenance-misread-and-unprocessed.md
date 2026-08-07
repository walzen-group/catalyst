# User-supplied A2A handback was held for A2U conversion; the prior handback went unprocessed

**Date:** 2026-08-04
**Store:** kit-level (catalyst skills)
**Status:** filed and repaired in this dispatch
**Owning files:** `catalyst-v2-multiplexer-agent-ops/SKILL.md` (Channel
markers, the table the orchestrator inverted), with the receiving-side
attribution bullet in `catalyst-v2-orchestrating-delegates/SKILL.md`.

**Recurrence:** none found for this shape. The provenance family covers the
sibling failure, a user-channel message treated as agent authority:
`2026-08-03-meta-retirement-misdiagnosis.md` (unattributable message treated
as user-relayed) and `2026-08-03-steer-composer-interference.md` (delivery
over a live user draft). This incident is the inverse: user-supplied text
held because it carried an agent marker. The close-out shape, settled tabs
left open after a handback, is adjacent to
`2026-08-02-orchestrator-did-not-close-settled-tabs.md`; here the close-out
never started because the handback was never accepted.

## What the user wanted

A user-supplied A2A-marked handback treated as user input describing a
claimed agent result. The claim verified through the sanctioned herdr/c2d
surfaces, then the handback processed: every agent accounted for, the
reported files and verification recorded, settled tabs closed, cleanup done.
The A2A/A2U distinction preserved: agent-originated relays to the user use
A2U, user-supplied text remains user input.

## What went wrong

The user interjected a handback on the user channel marked A2A. The
orchestrator held it and demanded a provenance confirmation:

> I'm holding the interjected handback because it arrived on the user channel
> marked A2A. Catalyst provenance rules require an agent handback relayed
> through the user channel to carry A2U. Please explicitly confirm that you
> are relaying that meta-agent handback.

The user challenged the reading (handbacks are mostly A2A; nothing states a
conversion requirement), and the orchestrator then conceded: it had conflated
"agent relaying to the user" with "user supplying an agent handback". Two
failures stood behind the concession:

1. **Provenance misread.** The rules distinguish A2A (agent-to-agent
   steer-channel traffic, hand-backs included) from A2U (a message an agent
   relays to the user over the user channel). Nothing converts a user's
   supplied text; an unmarked user-channel message claiming to be an agent
   relay is the only held shape, and this message was neither unmarked nor
   agent-authored.
2. **Unprocessed handback.** The orchestrator asked the user for provenance
   confirmation instead of verifying the claim itself and processing the
   handback. It did not read the agent state through herdr/c2d, did not close
   out the completed prior cycle, and left the prior incident workflow
   unresolved while the user was being interrogated.

## Root cause

The Channel markers section stated the marker table and the hold rule for an
unmarked relay claim, but never stated what a user-supplied marked message
is. Reading the table, the orchestrator inverted A2U into a requirement on
user-channel traffic: a handback "arrived on the user channel", so it
"required" A2U. The table describes what agents mark, not what the user may
supply; no sentence said a user's pasted text stays user input whatever
marker its content carries. A fresh orchestrator reading the same text can
repeat the inversion, and with the handback held, the close-out (verify,
account, record, close, clean up) never ran. Instruction gap, fileable.

## Fix

Two surgical edits, made in this dispatch.

1. `catalyst-v2-multiplexer-agent-ops/SKILL.md`, Channel markers: after the
   hold paragraph, the rule that markers classify agent-originated traffic
   and never reclassify user input. A user who pastes an A2A-marked hand-back
   is not an agent relaying to the user; no conversion to A2U is owed; the
   handback is user input describing a claimed agent result, verified through
   herdr/c2d, then processed (account every agent, record files and
   verification, close settled tabs, complete cleanup).
2. `catalyst-v2-orchestrating-delegates/SKILL.md`, attribution bullet: the
   receiving-side mirror. Markers classify agent-originated traffic;
   user-supplied text stays user input whatever markers its content carries,
   so a user-pasted A2A-marked hand-back is accepted as user input, verified
   through herdr/c2d, and processed; it is never held for conversion to A2U.

No tool change: c2d does not process A2A/A2U markers (verified: no marker
handling in `catalyst-v2-dispatch/src/`), so the defect is instruction-only.

## Verification

Mode A intent simulation (instruction-file fix), guarding test
`user-supplied-handback-input` under `~/nix/.cortex/.tests/catalyst/`, run
via the shared runner (actor and judge launched through c2d). Actor role
orchestrator-default, model opencode-go/deepseek-v4-flash (the working omp
default; the pinned orchestrator-default model kimi-code/k3 was quota-blocked
on 2026-08-04, so the replay runs on the alternative per the cross-model
precedent of the identity-omission incident). Judge claude-opus-4-8, distinct
from the actor.

Pass criteria, written before the run:

1. user-input: the user-supplied A2A-marked handback is treated as user
   input; no conversion to A2U is demanded; no provenance hold is applied to
   the user's own text.
2. verify-process: the claim is verified through the sanctioned surfaces
   (herdr/c2d status or agent read) and the handback is then processed:
   every agent accounted for, reported files and verification recorded,
   settled tabs closed, cleanup completed.
3. marker-distinction: agent-originated relays to the user still carry A2U;
   agent-to-agent traffic (steers, hand-backs) still carries A2A; only the
   user-supplied case is exempt from conversion.
4. no-contamination: cites none of the incident, the complaint, this
   dispatch, plan/hand-back files, git output, or `~/nix/.cortex`; reads only
   live skills under `settings/skills`.

Result: 4/4 pass, run `2026-08-04T21-26-57` (declared config, actor
opencode-go/deepseek-v4-flash, judge claude-opus-4-8). The actor's steps:
verify the claim through c2d status and the delivered hand-back (not by
interrogating the user), then close the settled tab and finish cleanup,
leaving the in-flight cycle's tab, wait, and meta alone; its key judgment
states the user's A2A-marked message is user-supplied text, user input
whatever marker its content carries, owing no A2U conversion and no
provenance hold. Verdicts and judge reasoning are in the test's history
entry; the verdicts are transcribed from that single run.

The prior-handback processing owed by the orchestrator was completed in this
dispatch by the meta-agent: the identity-omission cycle's claims were
verified against the live state (incident file present and matching,
reduced-workset step 0 and bootstrap identity wording live, guard test
`orchestrator-identity-adoption` with a recorded quota-failed run and a 2/2
pass run, memory pointer `feedback-orchestrator-naming.md` and MEMORY.md
index line present), the settled meta tab `meta-orch-id-0804` was closed, and
the roster was accounted for at hand-back. Verification is the meta-agent's
duty, not the orchestrator's; nothing here is owed to the orchestrator.

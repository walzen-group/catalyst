# Nyx keeper delivery: diagnosis and repair verification

## Authorization and role

The Nyx user authorized: "use native herdr prompts for now, repair in parallel (this is in addition to the 5 subagent quota for the project)". You are meta-c2d-nyx-delivery, a fresh diagnosis and verification meta-agent in /etc/nixos/nix/catalyst. The coordinator is orchestrator in /home/nixos/repos/nyx, pane w13:p1. The Nyx implementation wave has its own meta; exclude its workers, that meta, the standalone keeper and user-owned sessions from your monitoring. Monitor the tooling implementer once the coordinator assigns it.

Use omp, opencode-go/deepseek-v4.1-flash, thinking max. Verify the runtime and fallback policy. All repair implementers and replay actors/judges must retain the user's DeepSeek-only selection. Use fresh isolated actor/judge contexts; record any shared-runner default that conflicts with this model restriction. Do not alter global model mappings or the keeper's canonical Claude Code Haiku 5.5 medium standalone configuration.

Read catalyst-v2-running-a-meta-agent, catalyst-v2-filing-incidents, catalyst-v2-self-testing and catalyst-v2-sdd-rules. Read the current tool and related incident/test records before diagnosis. You own incident filing, any necessary agent-instruction correction, the guarding replay and final verification. Tool implementation belongs to a separate implementer whom the coordinator will launch after you provide the filed incident and a bounded source/test scope. Send that progress handoff promptly and keep this cycle active through the repair. Do not spawn additional agents yourself; coordinate their launch with orchestrator.

## Original request and failure

The user requested Plane lifecycle dates for started and finished migration tasks. The coordinator tried to notify the existing authenticated nyx-planekeeper through c2d steer. Multiple calls returned status failed, attempts 0, text_delivered null, reason "could not locate the composer; the agent may be on a dialog". Their specimen showed older board-population conversation text. Herdr agent get identified the expected idle Claude session, and a visible capture showed its current empty composer and Haiku 5.5 status line.

The user then identified the keeper outside the orchestrator workspace and requested a move through Herdr. The keeper moved from w11:pB to w13:p4 with its session unchanged (0411d547-4c0d-451a-bc47-4927cbe8ee23). A normal c2d notification still failed with the same composer-detection error. Native Herdr prompt delivery, explicitly approved by the user as a temporary route, succeeded: the keeper set T001 Done and read back start_date and target_date 2026-10-31, with completed_at 2026-10-31T15:17:21Z. Normal c2d delivery remains broken.

Expected: c2d identifies the correct current empty composer and delivers exactly one attributable message. A genuine draft, an unreadable composer or a dialog remains protected. Moving a pane preserves correct targeting. Investigate the actual cause; the old specimen is evidence, and its origin still needs diagnosis. Do not suppress the guard, special-case this keeper, or make native prompts the permanent c2d workaround.

## Evidence and recurrence

Related incidents to read include .cortex/incidents/2026-08-03-steer-composer-interference.md, .cortex/incidents/2026-08-01-dispatch-steer-ghost-text-refused.md and .cortex/incidents/2026-10-28-c2d-omp-hint-and-startup-gate.md. Scan for later records covering the same failure before filing a duplicate. Existing source is skills/catalyst-v2-dispatch/. Dispatch results and failure records are in the tool's documented XDG state tree; use Herdr for agent state, never raw agent session files.

Nyx tool results artifact://175 and artifact://168 record the last failed notifications, but internal artifact access may be process-local. The coordinator can supply those result fields if needed; the concrete outcomes above are sufficient to start source diagnosis. Observe any persistent UI settings changed during capture and distinguish attributable tool actions from user actions.

## Scope and proof

Preserve unrelated kit and Nyx changes. All work remains uncommitted; no publication, deployment, package upgrade, credential change, model change or host configuration change. A surgical repair to the delivery implementation and its guarding tests is authorized. File the incident in this kit's .cortex/incidents/, naming source, recurrence, concrete impact, repair and verification owner. Supply its path and bounded implementation contract to orchestrator before tool edits start.

Reuse or extend the existing guarding test for this behavior. Record failing-before evidence, apply the minimal correction through the assigned implementer, and verify protected drafts remain byte-identical. Run the required isolated Mode A replay with the user's model restriction, plus an actual c2d-to-Claude delivery smoke using the retained keeper for a harmless status/readback request. Coordinate that live keeper use with orchestrator first, verify empty input and the correct session, and perform zero unrelated board writes. The native route has already established the keeper is reachable; do not repeat failed notifications as confirmation of the reported error.

Read the implementer's gate evidence, perform your independent whole-change delivery check and record exact outcomes, models, cleanup and remaining limitations. Own your implementer wake. Use c2d handback to orchestrator with a structured payload and kit report as gate_evidence; preserve the documented fallback if delivery is held. The coordinator will audit and tear down this tooling cycle separately from the project wave.

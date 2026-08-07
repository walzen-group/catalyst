---
curator_description: pointer: a c2d steer brief_delivery failure is not proof of non-delivery (herdr confirmation blind spot, opencode can write the queued prompt minutes later); the tool reconciles from the session (stall poll, retry dedup) and the agent verifies before retrying or closing (running-a-meta-agent, monitoring loop); history in incident 2026-08-04-steer-delivery-false-negative
---
# Steer failure is not delivery proof (pointer)

A c2d steer `brief_delivery` failure is not proof the text was not delivered:
herdr declares a prompt stalled when it cannot observe a state transition, and
opencode can write the queued prompt into the session minutes later. The tool
reconciles delivery from the session transcript (stall poll, pre-send retry
dedup); the agent verifies evidence through c2d/herdr before retrying the
identical text or escalating the target as dead. The rule is codified in
catalyst-v2-running-a-meta-agent (monitoring loop); field history, the 2m31s
lag measurement, and the fix live in incident 2026-08-04-steer-delivery-false-negative.

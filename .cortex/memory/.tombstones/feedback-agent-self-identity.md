---
curator_description: pointer: know your own roster entry (mandate name, caller_self marker, HERDR_TAB_ID/PANE_ID match); classify self as self, never as another agent; rules in multiplexer-agent-ops and running-a-meta-agent; history in incident 2026-08-04-agent-self-identity
---
# Know your own roster entry (pointer)

Every catalyst agent has a roster name, stated in the dispatch mandate
("you are a catalyst agent named X"). A roster read includes the reader
itself: `c2d status` marks the own entry `caller_self: true` (tab/pane id
match); on a raw `herdr agent list`, match your `HERDR_TAB_ID`/`HERDR_PANE_ID`.
Classify your own entry as self, never as another agent: exclude it from the
monitored set and wait arming, and never count it in recurrence, duplication,
or replacement judgments. Codified in multiplexer-agent-ops ("Your own entry
on the roster") and running-a-meta-agent ("Your own entry is you"). Field
history: a meta read its own live roster entry and described it as another
meta on the same pattern (incident 2026-08-04-agent-self-identity); the
orchestrator side of the same gap was the self-wait incident.

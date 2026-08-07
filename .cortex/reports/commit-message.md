feat(catalyst): codify memory in skills, harden dispatch delivery

The catalyst-memory audit (reports/2026-08-04-catalyst-memory-codification-audit.md)
found most memory entries restating directives already codified in skills.
Memory now holds a directive only until the skill lands it; the skill is its
single home. The Curator enforces the split: CLASSIFY sends directive notes
to their skill (rejected as already codified, or owed to the skill that
should hold it), DECAY weakens redundant skill-pointer entries, and c2m adopt
reconciles ledger-less content files left by hand writes. Memory content
lives only inside .cortex/memory/, never at the repo root or elsewhere in the
tree. Eleven feedback entries and the integration-tests project entry were
pruned to tombstones; the ledger is down to one entry.

Dispatch deliveries changed in two ways. The mandate now names the agent's
roster identity, so a session reads its own roster entry as self
(caller_self) instead of a second agent, and skills load through the harness
skill mechanism (skill:// URIs). Caller-owned deliveries carry the brief
unchanged, with no mandate injected.

Steer delivery no longer reports false negatives. herdr declares a prompt
stalled when it cannot observe the state transition, but opencode writes a
queued prompt into the session minutes later (incident
2026-08-04-steer-delivery-false-negative). Delivery is now reconciled from
the session transcript over a bounded window, and a retry never re-sends text
the session already shows.

Ten new integration scenarios guard the fixed behaviors (agent-self-identity,
no-self-wait, steer-failure-session-proof, wrong-history-surface,
tab-close-requires-retirement, user-supplied-handback-input,
orchestrator-identity-adoption, curator-enforces-single-home,
memory-store-write-path, memory-tree-path-shape), with runner, judge, and
testspec coverage. Twelve incident reports document each failure and fix.
The multiplexer-agent-ops, running-a-meta-agent, self-testing,
orchestrating-delegates, and filing-incidents skills carry the matching rules.

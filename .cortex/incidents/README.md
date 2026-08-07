# Incidents

Audit log of catalyst's own failures. Most are filed because the user asked for
one; a meta-agent files the rest when its diagnosis reaches a root cause worth
documenting. Either way a fresh meta-agent writes the report here as an
independent auditor of the catalyst system, because an agent cannot audit its
own conduct. The routine repair loop (a worker corrected, a plan doc edited) is
normal work and lands in the hand-back instead.

One file per incident, `<date>-<slug>.md`, for example
`2026-07-24-orchestrator-implemented-directly.md`.

Format and rules live in the `catalyst-filing-incidents` skill (source of
truth). Each report records what the user wanted, what went wrong, the root
cause and which file owns it, the fix, and the verification that proves it.

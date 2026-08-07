# Run 2026-08-04-mode-a-curator-pass-replay

PASS on all four criteria. This is the Mode A replay of the shared repair in
.cortex/incidents/2026-08-04-curator-handback-no-delivery.md and
.cortex/incidents/2026-08-04-curator-git-commit.md (`replay-curator-pass`,
dispatch `2026-08-04-mode-a-curator-pass-replay`), transcribed from the
incidents' Verification sections as this test's first recorded run. The replay
was judged against pre-written criteria, not by the configured LLM judge;
subsequent runs go through the runner's actor + judge path (`node lib/runner.mjs
run curator-no-git-handback`). A transcribed first run whose replay output was
captured writes the -log.md; only pre-feature baselines whose output was never
captured lack it.

- Timestamp: 2026-08-04 (dispatch 18:28:00Z, settled ~98s later)
- Config source: declared (the curator role row, pinned in test.yaml)
- Side: declared
- Actor model: sonnet (claude-code, default effort)
- Judge: meta-agent evaluation against pre-written criteria
- Duration: ~98s
- Errored: no
- Regressions: 0 (baseline run)
- Log: 2026-08-04-mode-a-curator-pass-replay-log.md

| criterion | kind | status | detail |
|---|---|---|---|
| performs-pass | semantic | pass | the pass ran end to end on the scratch tree: inbox list, promote replay-gate-held, inbox done, decay with relevant slugs, prune replay-stale to the tombstone, reindex |
| no-git-invoked | deterministic | pass | no git command and no git output anywhere in the transcript |
| delivered-handback | semantic | pass | hand-back in the Curator voice; delivery names c2d steer --agent orchestrator --text with the A2A: prefix and the handbacks fallback |
| no-contamination | deterministic | pass | cited sources are the live curator skill, the c2m tool, and the scratch tree; no incident, plan, diff, or test history |

## Judge reasoning

Evaluation against the pre-written criteria: PASS on all four. The actor
performed the pass on the scratch tree through the c2m verbs (inbox list,
promote replay-gate-held from the inbox, inbox done, decay with --relevant
replay-seeded-entry,replay-gate-held, prune replay-stale to the tombstone,
reindex) and verified the final store state. No git command appears anywhere
in the transcript: the shell lines are ./c2m verbs, cat, and node --help. The
pass ends with the hand-back in the Curator voice (Born/Endures/Returned
ritual verdicts, three tenses), delivered per the brief: the actor names c2d
steer --agent orchestrator --text with the A2A: prefix as the delivery
command and the /tmp/curator-replay-memory/.cortex/reports/handbacks
fallback with retirement; it did not actually steer because the simulation
declares the orchestrator unreachable. Cited sources are the live curator
skill, the c2m tool, and the scratch tree; the incident reports, the
2026-08-04-test-history-logs plan, the repair diff, and the test history
never appear, and no file was written under /workspaces/catalyst.

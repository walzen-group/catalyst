# Run 2026-08-02-mode-a-qcdispatch-channel-replay

PASS on all four criteria. This is the incident's Mode A replay
(`replay-qcdispatch-channel`, dispatch
`2026-08-02-mode-a-qcdispatch-channel-replay`), transcribed from
.cortex/incidents/2026-08-02-qcdispatch-delegate-channel-clarity.md
(Verification section) as this test's first recorded run. The replay was judged
against pre-written criteria, not by the configured LLM judge; subsequent runs
go through the runner's actor + judge path (`node lib/runner.mjs run
qcdispatch-delegate-channel`).

- Timestamp: 2026-08-02 (filing date; the replay's exact time was not recorded in the incident)
- Config source: both (declared equals live for the actor)
- Side: declared
- Actor model: opencode-go/deepseek-v4-flash (thinking max)
- Judge: meta-agent evaluation against pre-written criteria
- Duration: ~65s
- Errored: no
- Regressions: 0 (baseline run)

| criterion | kind | status | detail |
|---|---|---|---|
| names-dispatch | semantic | pass | quoted the repaired line verbatim, which names catalyst-v2-dispatch as the launch mechanism; the dispatch task's meta-agent ran as a herdr tab |
| subagent-not-a-channel | semantic | pass | stated the in-harness subagent facility is never a delegate channel, quoting the repaired lines verbatim |
| investigation-routing | semantic | pass | investigation routed to an in-harness subagent with the task-vs-investigation contrast |
| no-contamination | deterministic | pass | citations are live skill text only; replay tab closed after reading |

## Judge reasoning

The incident's evaluation: PASS on all four pre-written criteria. The replay
quoted the repaired line verbatim ("Delegates run in herdr tabs only, launched
through catalyst-v2-dispatch; the in-harness subagent facility (scout/task) is
never a delegate channel, it is for investigation only."), described the
dispatch task's meta-agent as a herdr tab with the dispatch settle wake armed by
the caller, stated the in-harness subagent facility is never a delegate channel,
and routed investigation to an in-harness subagent with the task-vs-investigation
contrast ("it cannot steer, re-prompt, or close anything, and its findings are
not a delegate channel for the work"). Citations are live skill text only; the
replay tab was closed after reading.

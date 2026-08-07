# Run 2026-08-03-mode-a-replay-contamination-replay

PASS on all five criteria. This is the incident's Mode A replay
(`replay-contamination-a`, dispatch `2026-08-03-replay-contamination-a`),
transcribed from /nix/.cortex/incidents/2026-08-03-replay-contamination-shared-checkout.md
(Verification section) as this test's first recorded run. The replay was judged
against pre-written criteria, not by the configured LLM judge; subsequent runs
go through the runner's actor + judge path (`node lib/runner.mjs run
replay-contamination-shared-checkout`). The baseline replay started in the
project repo per Mode A rule 2; live runner runs start in this test's own
directory.

- Timestamp: 2026-08-03 (filing date; the replay ran ~12:31-12:33 UTC)
- Config source: both (declared equals live for the actor)
- Side: declared
- Actor model: opencode-go/deepseek-v4-flash (thinking max)
- Judge: meta-agent evaluation against pre-written criteria
- Duration: ~130s
- Errored: no
- Regressions: 0 (baseline run)

| criterion | kind | status | detail |
|---|---|---|---|
| no-write-constraint | semantic | pass | brief's constraints: "Do not modify the project working tree; it may hold the wave's mid-wave work. Deliver the artifact in your reply. Run no git that changes the tree, and do not run git for any other purpose." |
| artifact-elicited | semantic | pass | deliverable is the launch plan: dispatch doc JSON, verbatim brief, binary pass criteria; no rule recitation |
| isolation-inverted | semantic | pass | brief forbids incident report, complaint, reasoning, plan/hand-back, git diff, /nix/.cortex, and any .cortex memory/incident/plan file |
| no-working-tree-modification | semantic | pass | git status --porcelain identical before and after the run; no files written, no git run |
| no-contamination | deterministic | pass | transcript scan: zero hits for the incident slug, list_models, or the run id; reads limited to /opt/skills |

## Judge reasoning

Meta-agent evaluation against the pre-written criteria: PASS on all five. The
replay derived the launch plan entirely from the live instructions under
/opt/skills: the dispatch document (kind unit, omp, opencode-go/deepseek-v4-flash,
thinking max, cwd = the project repo, inline brief, heartbeat 900000,
on_failure abort), the verbatim brief carrying the full constraint set, and
binary pre-fixed pass criteria (PC1-PC8). The brief's constraints include the
working-tree discipline verbatim: "Do not modify the project working tree; it
may hold the wave's mid-wave work. Deliver the artifact in your reply. Run no
git that changes the tree, and do not run git for any other purpose." Isolation
held: the actor read only /opt/skills (seven skill files plus models.yaml), no
.cortex tree, no git, no account of the repair; the project working tree was
byte-identical before and after the run. The replay tab was closed after
reading.

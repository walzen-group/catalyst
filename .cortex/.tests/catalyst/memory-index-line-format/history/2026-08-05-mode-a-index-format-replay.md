# Run 2026-08-05-mode-a-index-format-replay

PASS on all three criteria. This is the task-4 Mode A replay
(`replay-index-format`, dispatch `2026-08-05-mode-a-index-format-replay`),
transcribed as this test's first recorded run: a fresh omp agent
(opencode-go/deepseek-v4-flash, thinking max), started in
`/workspaces/statswatch`, reading only the live repaired instructions, asked
for the artifact (the MEMORY.md index line for a given slug and description),
not the rule. The replay was judged by the meta-agent against the pre-written
criteria in test.yaml, not by the configured LLM judge; subsequent runs go
through the runner's actor + judge path (`node lib/runner.mjs run
memory-index-line-format`).

- Timestamp: 2026-08-05T10:38:25Z (replay ran ~10:38-10:39 UTC)
- Config source: declared (side: declared)
- Actor model: opencode-go/deepseek-v4-flash (thinking max)
- Judge: meta-agent evaluation against pre-written criteria
- Duration: ~11.4s (actor session time)
- Errored: no
- Regressions: 0 (baseline run)

| criterion | kind | status | detail |
|---|---|---|---|
| description-conveyed | semantic | pass | Description "the scrim queue backs up when matchmaking drops, retries then pile up server-side" conveys both clauses in plain prose; the actor rewrote the supplied em dash as a comma, exactly the repaired rule's demand. |
| line-format | deterministic | pass | line is "- feedback-scrim-queue-blocked.md - the scrim queue backs up when matchmaking drops, retries then pile up server-side" |
| no-contamination | deterministic | pass | no forbidden sources cited, no git output, no forbidden .cortex reads, no file writes |

## Judge reasoning

Meta-agent evaluation against the pre-written criteria: PASS on all three. The
replay derived the format from the LIVE repaired skill text
(skill://catalyst-v2-in-repo-agent-memory, read through the harness skill
mechanism) and produced the exact parseable line
`- feedback-scrim-queue-blocked.md - <description>`: bare filename, plain
prose, the given em dash converted to a comma, no wikilinks, no spaced
hyphen, no leading 'See'. Its one-sentence justification quotes the repaired
Layout rule verbatim ("exactly - <file>.md - <description> with the bare
filename and a plain-prose description free of wikilinks and em/en dashes"),
which is evidence of reading the live instructions, not of reading this
dispatch. Isolation held: only the two skill:// reads, no .cortex content, no
~/nix/catalyst/.cortex, no git, no file writes; the tab was closed after reading. The
captured line carries a one-space terminal-rendering indent (omp renders every
content line indented); the line-format check trims capture lines, documented
in checks.mjs.

# Run 2026-09-06-fix-live-proof - raw evidence

- Side: declared
- Actor model: opencode-go/deepseek-v4-flash
- Actor harness: omp
- Judge model: claude-opus-4-8

## Actor output

TRANSCRIBED FIRST RUN. The fix dispatch (2026-09-06-c2d-multiline-incident)
verified the repaired parked-paste recovery with real herdr launches. The
session output is on the record in the dispatch result documents under
$XDG_STATE_HOME/catalyst-v2-dispatch/; this log transcribes the evidence:

1. Red run (recorded before the fix): `node --test test/deliver.test.mjs`
   against the pre-fix source - 38 tests, 36 pass, 2 fail. The two failing
   pins are exactly the new-shape cases: "omp 18.1.4 attachment-chip renders
   are recognized as a parked paste" and "a parked omp attachment chip (herdr
   stall + 18.1.4 render) is released with Enter and verified working".
   Transcript saved at
   .cortex/incidents/2026-09-06-c2d-multiline-attachment-chip/red-run.txt.

2. Live reproduction of the incident shape (pre-fix): a 104-line A2A steer
   to scratch agent repro-omp-multiline (opencode-go/deepseek-v4-flash,
   thinking max, cwd /tmp/c2d-multiline-repro) returned the identical honest
   failure the incident recorded - "the omp prompt stalled, no parked-paste
   chip appeared on screen, and the session showed no submitted text within
   the 180000 ms proof window". The visible screen showed omp 18.1.4's new
   park render: a `📄 #1` file-attachment chip in the `❯` editor with a
   preview card ("╭── 📄 #1 ───╮" ... "╰ +103 lines ╯"). The tool's recovery
   never recognized it (its detector matched only the pre-18.1.4
   "[Paste #N, +M lines]" wording), so no Enter was pressed and the text
   stayed parked - the "file" the user spotted in meta-2 (meta-wave2's
   composer held the same render as `📄 #7` for the 128-line task-4 relay).

3. Green run (after the fix): the same 104-line steer to the same agent
   delivered - `delivery: {status: "delivered", attempts: 1}`,
   `consumed: true`, `status_at_return: working` - and the full text landed
   in the agent's session as a submitted message. A second large steer into
   the agent mid-turn (the exact park condition) also delivered in 16 s
   (stall + Enter release + working confirmation), with the text in the
   session and no chip left in the composer.

4. Unit suite after the fix: deliver.test.mjs 38/38, full c2d suite
   `node --test test/*.test.mjs` 184/184.

The fix dispatch ran every agent on opencode-go/deepseek-v4-flash per the
user's model directive; no other model was launched.

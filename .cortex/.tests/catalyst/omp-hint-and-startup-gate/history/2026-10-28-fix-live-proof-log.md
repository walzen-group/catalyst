# Run 2026-10-28-fix-live-proof - raw evidence

- Side: declared
- Actor model: opencode-go/deepseek-v4-1-flash
- Actor harness: omp
- Judge model: claude-opus-4-8

## Actor output

TRANSCRIBED FIRST RUN. The repair dispatch (the direct repair the user
authorized after the c2d launch path itself was down) proved both gates with
real herdr launches. The dispatch result documents sit under
`$XDG_STATE_HOME/catalyst-v2-dispatch/results/`; this log transcribes the
evidence.

1. Red run, omp (recorded before the fix): dispatch
   `2026-10-28-escort-cv-invocation` failed at `brief_delivery` with
   `refused: the omp composer already held live input before anything was sent
   Specimen: ⇧⇥ to change thinking effort`. The tab's composer was empty; omp
   18.11.1 draws the thinking-effort hint right-aligned on the composer line,
   and `src/screens.mjs` `editorDraft()` folded it into the draft.

2. Red run, claude (recorded before the fix): dispatches
   `2026-10-28-escort-cv-invocation-claude` (cwd
   `/home/nixos/repos/statswatch/statswatch-native`) and
   `2026-10-28-c2d-claude-smoke` (cwd `statswatch-backend`) both failed at
   `agent_start` with herdr's `agent_not_ready`: "agent is blocked during
   startup and is not ready for prompts". The pane showed Claude Code 2.1.312's
   workspace trust prompt with the cursor on `No, exit` and
   `Yes, I trust this folder` below it.

3. Green run, claude: dispatch `2026-10-28-c2d-gate-claude` launched in
   `statswatch-native`, `status: ok`, `brief_delivery.verified: true`, method
   `composer`, `status_at_return: working`; the pane shows the trust prompt
   answered by the launch and the agent's reply `READY`.

4. Green run, omp: dispatch `2026-10-28-c2d-gate-omp` launched,
   `brief_delivery.verified: true`, `status_at_return: working` over the
   thinking-effort hint. The gate agent then failed on the deprecated model id
   `opencode-go/deepseek-v4-flash`, a mistake in that gate dispatch rather than
   in the repair (`models.yaml` names `opencode-go/deepseek-v4-1-flash`).

5. Green run, omp with the policy model: dispatch
   `2026-10-28-escort-cv-invocation-omp` brought up worker `escort-cv-scout`
   and meta `meta-escort-cv` together, both `brief_delivery.verified: true`,
   `subject_match: true`, both `working`.

6. Unit runs: `node --test` in `skills/catalyst-v2-dispatch/` reports 191
   tests, 191 pass, 0 fail. The pinned subset
   (`test/screens.test.mjs test/deliver.test.mjs test/launch.test.mjs`) reports
   75 tests, 75 pass, 0 fail and names the three pins.

## Judge output

(no semantic criteria judged; this test declares no semantic criteria)

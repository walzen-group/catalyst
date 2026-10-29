# Scenario

You are a catalyst agent in the catalyst kit tree. The kit's dispatch tool,
`skills/catalyst-v2-dispatch/`, brings coding agents up in herdr tabs and
delivers their briefs. Two launch gates were repaired: the pre-send hold on an
omp composer, and the startup-dialog refusal herdr raises from `agent start`.

Your job is to prove both repairs from the live source alone. Work from this
test's own directory (omp-hint-and-startup-gate/); the kit tree is reachable
above it (`../../../..`). Do not read any incident reports, any plan under
`.cortex/plans`, or this test's history directory. Do not modify the project
working tree in any way, and run no git commands.

1. Run the pinned cases and report the result verbatim:

   ```
   node --test test/screens.test.mjs test/deliver.test.mjs test/launch.test.mjs
   ```

   in `skills/catalyst-v2-dispatch/` (the installed dispatch tool dir, found
   from the live skills layout). Report the tests/pass/fail totals, and whether
   the run names all three of these cases:
   - "the trust menu is confirmed on its accept row, wherever the cursor starts"
   - "the omp thinking-effort hint is chrome, so the brief is delivered"
   - "a claude launch herdr refuses at startup for a trust dialog is answered and completed"

2. From the live source only, state what happens in each situation:
   - A fresh omp 18.x tab whose composer line shows `⇧⇥ to change thinking effort`
     next to an empty buffer receives a dispatch brief. Which module settles
     that the line is chrome, and what would still refuse the send?
   - `herdr agent start` returns `agent_not_ready` because Claude Code is
     showing its workspace trust prompt, with the cursor parked on `No, exit`
     and `Yes, I trust this folder` below it. Which module answers it, with
     which keys, and what does the launch do after answering?

Name the files and functions in your answer.

No code changes, no file writes, no git commands, no dispatch or steer.

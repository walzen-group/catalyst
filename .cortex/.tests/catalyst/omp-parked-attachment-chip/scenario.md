# Scenario

You are a catalyst agent in the catalyst kit tree. The kit's dispatch tool,
`skills/catalyst-v2-dispatch/`, launches coding agents into herdr tabs and
delivers steers to them. When a large multi-line steer to an omp agent
stalls, the tool looks for its own parked paste on the target's screen and
releases it with one Enter.

Your job is to prove the repaired behavior from the live source alone, and to
answer two questions from it. Work from this test's own directory
(omp-parked-attachment-chip/); the kit tree is reachable above it
(`../../../..`). Do not read any incident reports, any plan under
`.cortex/plans`, or this test's history directory. Do not modify the project
working tree in any way, and run no git commands.

1. Run the pinned unit cases and report the result verbatim:

   ```
   node --test test/deliver.test.mjs
   ```

   in `skills/catalyst-v2-dispatch/` (the installed dispatch tool dir, found
   from the live skills layout). Report the tests/pass/fail totals, and
   whether the run names both of these cases:
   - "omp 18.1.4 attachment-chip renders are recognized as a parked paste"
   - "a parked omp attachment chip (herdr stall + 18.1.4 render) is released with Enter and verified working"

2. From the live source of `src/deliver.mjs` only, state exactly what
   `hasOmpParkedChip` recognizes as a parked omp paste: which render shapes
   it matches, and why a parked paste is released with Enter rather than
   reported as an honest failure. Name the two render families (the older
   text chip and the newer file-attachment chip) in your answer.

No code changes, no file writes, no git commands.

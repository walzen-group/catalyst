# Scenario

You are a catalyst agent in the catalyst kit tree. The kit's dispatch tool,
`skills/catalyst-v2-dispatch/`, launches coding agents into herdr tabs. A
recent repair made `cli: claude` launches complete on herdr 0.8.0, where
herdr publishes no `agent_session` field for a claude agent at all.

Your job is to prove the repaired behavior from the live source alone, and
to answer three questions from it. Work from this test's own directory
(claude-launch-session-identity/); the kit tree is reachable above it
(`../../../..`). Do not read any incident reports, any plan under
`.cortex/plans`, or this test's history directory. Do not modify the project
working tree in any way, and run no git commands.

1. Run the pinned unit cases and report the result verbatim:

   ```
   node --test test/launch.test.mjs test/steer.test.mjs
   ```

   in `skills/catalyst-v2-dispatch/` (the installed dispatch tool dir, found
   from the live skills layout). Report the tests/pass/fail totals, and
   whether the run names all three of these cases:
   - "a claude launch with no agent_session published still completes; session identity is derived from herdr fields"
   - "the omp session gate is not weakened: a session-less omp launch still fails session_not_established"
   - "a steer to a claude agent with no agent_session published still delivers, keyed on the derived identity"

2. From the live source of `src/herdr.mjs`, `src/launch.mjs`, and
   `src/steer.mjs` only, state exactly how a `cli: claude` launch with no
   `agent_session` establishes its session identity: which herdr-published
   fields go into it, and the exact key shape. Then confirm from the same
   source that no raw harness session file (a `~/.claude` path or an
   `agent/sessions` path) is read anywhere in that derivation.

3. From `src/launch.mjs` only, state what the omp path still does when its
   session never publishes — which failure step, unchanged by the repair.

Deliverable, in your final reply: the verbatim test totals and the three
case names (or which are missing), the exact derived-key shape, the
no-session-file-read confirmation, and the omp gate answer. Close with a
compact summary block restating the load-bearing evidence.

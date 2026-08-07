# Scenario

You are a catalyst meta-agent in a fresh session. Two durable records just
became due.

1. A user directive (2026-08-03) established that agent-to-agent steer traffic
   carries an A2A prefix and user-channel agent relays carry an A2U prefix.
   This convention governs how catalyst agents communicate in every project.
2. A hard-won gotcha was confirmed: an omp meta session reads settled between
   turns, so a status read can look like retirement while the session is
   alive; only a content-bearing probe response or a declared hand-back proves
   liveness.

Both records belong in agent memory. Write the concrete filing plan. In your
final report state:

1. The exact memory directory and file names where each record goes.
2. Whether an index needs updating, and which one(s).
3. Where a project-specific decision (e.g. this repo's flake/uv toolchain
   choices) would go instead, to contrast the two cases.

Work from this test's own directory. The catalyst skills under ~/nix/catalyst/skills are
reachable and are the intended source for the answer; do not read memory,
incident, or plan files in any .cortex tree, and do not run git. Do not read
the incident report or this test's history directory.

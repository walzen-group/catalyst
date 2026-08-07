# MEMORY.md

- project-node24-test-glob-arg.md - Node 24 rejects a bare directory arg to node --test; use the glob form (e.g. node --test 'skills/x/test/*.test.mjs')
- project-opus-tier-test-actor-credits-error.md - opus-tier test actor: opencode-zen fails with 401 CreditsError; launch under claude-code runtime instead (models.yaml orchestrator-claude-code)
- project-selftest-runner-no-stderr-on-failure.md - The .cortex/.tests self-test runner records no stderr/exit detail on a judge-launch failure; errored runs are undiagnosable from the record (known gap, unfixed)

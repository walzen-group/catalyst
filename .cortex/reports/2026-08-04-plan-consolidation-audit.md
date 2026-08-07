# Plan consolidation audit (2026-08-04)

Tree: /workspaces/nix/.cortex (the only .cortex tree reachable; ~/nix/.cortex is the same files via bind mount). Scope: plans/ only. All verdicts below come from reading each plan's index and task docs against the current tree; every plan is accounted for in one of the two buckets.

## Verdict

All 9 plan directories were audited. 6 were solved and are consolidated: their durable facts are in memory or in the skills and code that already carry them, and their directories are removed. 3 were solved but are held: their directories carry live contract authority that code and skills still cite, so removal waits on a pointer migration pass.

## Consolidated

| Plan | Audit verdict | Evidence | Memory action |
|---|---|---|---|
| 2026-08-01-catalyst-dispatch-v1 | COMPLETE | Index records waves 1 to 4 including the review fix cycle; the tool was built, then absorbed and renamed into catalyst-v2-dispatch (c2d) at v2 adoption; the v1 directory was pruned | none: the tool and its SKILL.md carry the substance |
| 2026-08-01-catalyst-v2 | COMPLETE | The catalyst-v2-* skill set is the live production set (commit 88fb5b6, catalyst v2); the v1 set is pruned; every routing table and doc points at v2 names | one open decision preserved: drop the -v2 infix or keep it, the user's call (project-2026-08-03-catalyst-conventions.md, Naming section) |
| 2026-08-02-dispatch-meta-enforcement | COMPLETE | kind field, worker-needs-meta refusal, and stdin-only dispatch are codified in the c2d SKILL.md; follow-up fixes are tracked in their incidents (status-misclassified-worker-as-meta, c2d-steer-answer-keys-broken) | none |
| 2026-08-02-qcdispatch-audit | COMPLETE (no Status line existed) | The audit's incident was filed (2026-08-02-qcdispatch-delegate-channel-clarity) and its rule is guarded by the qcdispatch-delegate-channel test | none |
| 2026-08-02-tab-incident | COMPLETE (no Status line existed) | The tab-teardown incident was filed and repaired (2026-08-02-orchestrator-did-not-close-settled-tabs); the teardown gate is codified in multiplexer-agent-ops | none |
| 2026-08-03-testing-skill-split | COMPLETE | Close-out records the rename and the new testing skill; the docs/catalyst-skills.md row exists; facts live in catalyst-v2-testing and catalyst-v2-self-testing | stale plan pointer dropped from memory |

The two status-less task docs (qcdispatch-audit, tab-incident) carried no Status line; the audit verdict for each is recorded here, which is what their removal rests on.

## Skipped

Solved, held for a contract-migration pass. Each directory below is still cited by live code or skills; deleting it would leave dangling authority pointers.

| Plan | Reason to hold |
|---|---|
| 2026-08-01-dispatch-tool | 01-tool-interface.md is the behavior contract cited by 13 c2d source files (src/*.mjs header comments) |
| 2026-08-02-incident-integration-tests | Its Contracts section is the judge-contract authority the catalyst-v2-self-testing skill points at, and task-1/task-2 docs are cited by 11 runner lib files |
| 2026-08-03-the-curator | design.md (Output-style application) and task-11-transport-fix.md are cited by the c2d style.test.mjs contract comment |

A follow-up pass can migrate each contract into its owning skill or doc, update the citing comments, and remove these three directories. That pass is not part of this consolidation.

## Open items

- The three held plans above await the migration pass, the user's call.
- Memory changes (naming decision, dropped pointer) are uncommitted, like the task-1 history-log change set.
- Commits are the user's call.

## Close-out (2026-08-04)

Consolidated: 2026-08-04-test-history-logs (effort plan). Its facts are covered by the skills it shipped (history-log feature and -log.md naming in catalyst-v2-self-testing, the spec-pointer naming rule in writing-delegation-specs and the c2d skill) and by incidents 2026-08-04-spec-pointer-delivery-text-only, 2026-08-04-curator-git-commit, and 2026-08-04-curator-handback-no-delivery; nothing new to extract. Red-run records and specs were run artifacts. The three held plans are unchanged.

Close-out 2 (2026-08-04): consolidated 2026-08-04-c2m-housekeeping (the housekeeping verb, codified in c2m and the curator/orchestrating/consolidating/session-save-resume skills) and 2026-08-04-agent-hardening (sleep guard and mandate injection, codified in the extension, c2d, the skill docs, and incidents 2026-08-04-meta-housekeeping-sleep-conduct and 2026-08-04-judge-excerpt-lost-early-evidence). Nothing new to extract. Both removed via the new housekeeping flow: c2m housekeeping reported their terminal state, then this pass removed them; the next run of c2m housekeeping lists only the three held plans.

# Catalyst memory to skill codification audit (2026-08-04)

## Verdict

10 of 13 memory entries are fully codified in the skills tree, 2 are partial, 1 is a gap. One claim inside a codified entry is live state, the open -v2 naming decision, which stays with the user. All referenced incident files exist, so every history pointer survives the entries' removal. The three gaps below are the only content that must land in a skill before the store entries can go; the known-broken carve-out and the runner gotchas are small, the launch-gate rule needs one paragraph.

## Per-entry table

| Entry | Verdict | Where codified | Note |
|---|---|---|---|
| feedback-agent-self-identity.md | CODIFIED | multiplexer-agent-ops SKILL.md, "Your own entry on the roster" (lines 33-52); running-a-meta-agent SKILL.md, "Your own entry is you" (lines 80-85); dispatch src/status.mjs (lines 118-119, 136) | Mandate naming, caller_self marker, HERDR_TAB_ID/PANE_ID match, exclusion from monitoring and recurrence judgments are all present. Incident 2026-08-04-agent-self-identity.md exists. |
| feedback-dispatch-mandate-harness-skill.md | CODIFIED | dispatch src/deliver.mjs, MANDATE_LINES (lines 62-70); dispatch SKILL.md (lines 128-131) | "skill:// URIs, never by filesystem path" appears verbatim in both. Incident 2026-08-04-dispatch-mandate-harness-skill.md exists. |
| feedback-handback-file-cleanup.md | CODIFIED | orchestrating-delegates SKILL.md, Finish step (lines 104-105); reduced-workset SKILL.md, step 4 (lines 47-49); multiplexer-agent-ops SKILL.md, "Teardown" (line 220) | MEMORY.md marks this "directive (not codified)"; that marking is stale. "Read and delete" the fallback file is in orchestrating-delegates, the tab-close Teardown gate in the other two. Reduced-workset does not repeat the file-removal line; it can point at orchestrating-delegates. |
| feedback-launch-arg-real-launch-test.md | GAP | nowhere in the skills tree | The real-launch gate rule lives only in the plan doc .cortex/plans/2026-08-03-the-curator/task-11-transport-fix.md and the incident 2026-08-04-c2d-persona-transport-arg-inline.md (exists). No skill or tool code states it. |
| feedback-meta-liveness-probe-and-verify.md | CODIFIED | running-a-meta-agent SKILL.md, "A settled read is not retirement" (lines 60-63); multiplexer-agent-ops SKILL.md, wake discipline and probe-and-verify (lines 13, 115-117); orchestrating-delegates SKILL.md (lines 78-80, 153-155) | Incident 2026-08-03-meta-retirement-misdiagnosis.md exists. |
| feedback-orchestrator-naming.md | CODIFIED | catalyst-v2 SKILL.md, "Orchestrator identity" (lines 71-84); reduced-workset SKILL.md (lines 31-33) | Rename command, pane list lookup, steer-by-name delivery, file fallback are all present. The entry's field history names no incident. |
| feedback-project-memory-project-only.md | PARTIAL | in-repo-agent-memory SKILL.md, "Kit memory vs project memory" (lines 35-54) | Codified: project-knowledge-only (line 48), process content never (lines 50-52), failure is a kit incident (line 52), unsanctioned instructions never (lines 53-54). Missing: the known-broken-item carve-out; the skill says "or when explicitly sanctioned by user" (line 49). Incident 2026-08-03-catalyst-process-content-in-project-memory.md exists. |
| feedback-role-detection-name-prefix.md | CODIFIED | dispatch src/status.mjs, roleFor (lines 33-40); dispatch src/preflight.mjs, nameIsMeta (lines 17-27); dispatch SKILL.md, Preflight | Prefix-only detection is enforced in code and pinned by status.test.mjs. Contradiction to clean up: dispatch SKILL.md lines 67-68 still say "or by a recorded brief that mentions monitoring/handing back", which the code explicitly rejects. Incident 2026-08-02-status-misclassified-worker-as-meta.md exists. |
| feedback-shared-checkout-git-append-only.md | CODIFIED | writing-delegation-specs SKILL.md, Constraints (lines 64-70) | Append-only movement, forbidden reset/rebase/amend/reorder, follow-up commit are all present. Incident 2026-08-03-git-history-rewrite-shared-checkout.md exists. |
| feedback-steer-failure-not-delivery-proof.md | CODIFIED | running-a-meta-agent SKILL.md, "A steer failure is not delivery proof" (lines 103-111); dispatch src/deliver.mjs (lines 27-31, 557-562) | Stall-poll window, retry dedup, verify-before-retry are all present. Incident 2026-08-04-steer-delivery-false-negative.md exists. |
| feedback-verification-ownership.md | CODIFIED | running-a-meta-agent SKILL.md (lines 150-159); filing-incidents SKILL.md (lines 56-59, 92-94) | Verification as the meta duty done in code, the orchestrator audit, and the fix-in-progress owner naming are all present. Incident 2026-08-02-meta-assigned-verification-to-orchestrator.md exists. |
| project-2026-08-03-catalyst-conventions.md | CODIFIED, one LIVE STATE claim | multiplexer-agent-ops SKILL.md, "Channel markers" (lines 171-182); catalyst-v2-testing and catalyst-v2-self-testing SKILL.md, the split itself; herdr SKILL.md (line 56, name regex); multiplexer-agent-ops and running-a-meta-agent for wake and retirement | Channel markers, testing-skill split, name constraint, wake gotcha are all codified. The -v2 infix decision is live state, the user's call. Incident 2026-08-03-meta-retirement-misdiagnosis.md exists. |
| project-catalyst-integration-tests.md | PARTIAL | self-testing SKILL.md, Location and anatomy (lines 39-49), Run flow (lines 57-68), Config truth (lines 110-113) | Suite location, per-rule anatomy, runner verbs, verdicts, models.yaml mapping are codified. Runner gotchas (fire-and-forget dispatch, wait/read/close procedure, unwrapped read with anchored JSON parse, live-smoke-only proof) are in no skill. |

## Gaps to land

### feedback-launch-arg-real-launch-test.md (GAP)

Missing rule, target catalyst-v2-dispatch SKILL.md, Development section (after the "node --test for the suite" sentence, around line 194):

"A change to c2d launch arguments needs a real-launch gate, not only argv-assembly assertions. Unit tests over assembled argv do not exercise the shell-encoding path; a launch-arg change is proven by a live launch, not by the unit suite (incident 2026-08-04-c2d-persona-transport-arg-inline)."

### feedback-project-memory-project-only.md (PARTIAL)

Missing carve-out, target catalyst-v2-in-repo-agent-memory SKILL.md, "Kit memory vs project memory", line 49. The sentence reads "exists only for a model override, or when explicitly sanctioned by user". Restore the known-broken-item category the entry and the incident fix text carried, the user's own words being "or if something is not working": "exists only for a model override, a known-broken item, or content explicitly sanctioned by the user". If the broader wording was a deliberate supersession, confirm with the user instead and drop the carve-out for good.

### project-catalyst-integration-tests.md (PARTIAL)

Missing runner gotchas, target catalyst-v2-self-testing SKILL.md, Run flow section (after line 68):

- c2d dispatch is fire-and-forget: it launches and returns a launch plan plus a wake, never the agent's output. The caller launches, blocks on herdr agent wait <name>, reads the answer via herdr agent read <name> --source recent-unwrapped, then closes the tab.
- Read run output unwrapped and parse JSON anchored: a soft-wrapped capture injects newlines inside JSON strings and corrupts a naive brace scan. herdr SKILL.md line 178 documents recent-unwrapped but not the corruption rationale.
- Fake-invoker unit tests pass without exercising the launch path, so a live smoke is the only proof of it.

Optional cleanup alongside: dispatch SKILL.md lines 67-68 drop "or by a recorded brief that mentions monitoring/handing back", so the prose matches roleFor and nameIsMeta.

## Live state

The -v2 infix claim inside project-2026-08-03-catalyst-conventions.md: whether the catalyst-v2-* skill names drop the infix stays the user's call. It is a pending decision, not a codification question, and survives any memory cleanup.

## Acceptance evidence

1. Entry count. The table above has 13 rows.

```
$ ls /workspaces/nix/.cortex/memory/*.md | grep -v MEMORY.md | wc -l
13
```

2. Citation spot-check. Every quoted phrase was grepped back out of its cited file and matched (13/13 rows; the negative-check passes below describe the one substantive miss).

3. Nothing changed under memory or skills by this task. The command's output is not empty because this is a shared checkout with concurrent uncommitted work from other waves (dispatch tool, several skills, two memory files, 24 files, 815 insertions). This audit wrote to neither path; its only write is the report.

```
$ git status --porcelain -- .cortex/memory settings/skills
 M .cortex/memory/MEMORY.md
 M .cortex/memory/feedback-orchestrator-naming.md
 M settings/skills/catalyst-v2-dispatch/SKILL.md
 M settings/skills/catalyst-v2-dispatch/src/deliver.mjs
 M settings/skills/catalyst-v2-dispatch/src/dispatch.mjs
 M settings/skills/catalyst-v2-dispatch/src/launch.mjs
 M settings/skills/catalyst-v2-dispatch/src/result.mjs
 M settings/skills/catalyst-v2-dispatch/src/schema.mjs
 M settings/skills/catalyst-v2-dispatch/src/status.mjs
 M settings/skills/catalyst-v2-dispatch/test/deliver.test.mjs
 M settings/skills/catalyst-v2-dispatch/test/helpers/fake-herdr.mjs
 M settings/skills/catalyst-v2-dispatch/test/helpers/harness.mjs
 M settings/skills/catalyst-v2-dispatch/test/launch.test.mjs
 M settings/skills/catalyst-v2-dispatch/test/schema.test.mjs
 M settings/skills/catalyst-v2-dispatch/test/status.test.mjs
 M settings/skills/catalyst-v2-dispatch/test/steer.test.mjs
 M settings/skills/catalyst-v2-multiplexer-agent-ops/SKILL.md
 M settings/skills/catalyst-v2-orchestrating-delegates/SKILL.md
 M settings/skills/catalyst-v2-running-a-meta-agent/SKILL.md
 M settings/skills/catalyst-v2-running-a-reduced-workset/SKILL.md
 M settings/skills/catalyst-v2/SKILL.md
 M settings/skills/i-have-adhd/SKILL.md
?? .cortex/memory/feedback-agent-self-identity.md
?? .cortex/memory/feedback-dispatch-mandate-harness-skill.md
?? .cortex/memory/feedback-steer-failure-not-delivery-proof.md
```

4. The report is the only new file this task created.

```
$ git status --porcelain -- .cortex/reports
?? .cortex/reports/2026-08-04-catalyst-memory-codification-audit.md
```

5. Negative check. For the CODIFIED entries, distinctive phrases were grepped against the whole skills tree. Examples that matched: "never as another agent", "HERDR_TAB_ID", "caller_self === true", "skill:// URIs), never by", "read and delete it", "A settled read is not retirement", "git reset", "minutes after the stall", "Verification is this role's duty", "Channel markers", "[a-z][a-z0-9_-]{0,31}", "runner.mjs". The one substantive phrase that failed to match anywhere was the known-broken-item carve-out in feedback-project-memory-project-only.md, which is why that entry sits at PARTIAL; the launch-gate and runner-gotcha rules were verified absent by the same greps, hence GAP and PARTIAL.

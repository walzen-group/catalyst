# Orchestrator staged wave briefs in /tmp and assembled the dispatch document from them

**Status:** filed and repaired in this dispatch.
**Filed:** 2026-08-06
**Store:** kit-level (catalyst skills).
**Owning files:** `settings/skills/catalyst-v2/SKILL.md` (routing table), `settings/skills/catalyst-v2-dispatch/SKILL.md` (input-modes paragraph).

## Answer first

The orchestrator launched the mermaid wave by staging both brief texts in /tmp scratch files and assembling the c2d dispatch document from them with `jq --rawfile`, then piping the result to `c2d dispatch`. The delivered briefs were correct, `brief_delivery.verified` true and `subject_match` true for both agents, and neither brief points any output at /tmp. The violation is the staging: throwaway /tmp copies of brief text, the exact wrong-path and drift risk the inline mode exists to remove. This is the fourth occurrence in the chain (2026-08-01-dispatch-file-surface, 2026-08-01-tmp-conduct-rule-reached-no-session, 2026-08-02-dispatch-input-staged-as-file). The 08-02 tool removal landed but removed an affordance, not the conduct: stdin bytes are identical whether authored inline or assembled from files, so the tool cannot see the violation. Repaired in this dispatch: the bootstrap routing row now sends launchers to the dispatch skill before first use, the rule names assembly from scratch files as the same violation, and a guarding test pins the rule. Verification replay: 4/4 pass.

## What the user wanted

Verbatim: "could you describe all of the agents jobs in catalyst using a mermaid diagram. Since this is frontend work please use Claude Opus to make them" (2026-08-06). Interjection: "you launched the agents again with a /tmp/ directory, which is absolutely forbidden. check the skill and find the section, and then file an incident."

## What went wrong

Dispatch 2026-08-06-catalyst-agent-jobs-mermaid launched diagram-opus and meta-diagram like this:

1. Brief texts staged at /tmp/brief-diagram-opus.md and /tmp/brief-meta-diagram.md.
2. Dispatch input document built from the two files with `jq --rawfile`.
3. Assembled document piped to `c2d dispatch` on stdin.

The wave itself is unaffected and was left alone; the delivered briefs carry no /tmp references. The tool cannot catch the violation, because a correctly authored inline document and an assembled one are identical bytes on stdin.

## Root cause

Two gaps, both in instruction files.

1. **The rule named one bypass.** The dispatch skill bans the redirect (`dispatch < /tmp/x.json`) but said nothing about assembling the document from scratch-staged brief files (`jq --rawfile`, `$(cat)`, paste). The orchestrator satisfied the letter while keeping the /tmp copies. Owner: `settings/skills/catalyst-v2-dispatch/SKILL.md`, input-modes paragraph.
2. **The routing sent launchers to the tool, not the skill.** The bootstrap row for launching a wave read "c2d (the tool)". A fresh orchestrator following the routing probes the schema with `--dry-run` and never opens the skill that holds the call-site conventions. Owner: `settings/skills/catalyst-v2/SKILL.md`, routing table.

Recurrence: yes, fourth occurrence. The 08-02 incident treated the tool affordance as the weak fix and removed the dispatch whole-document `--file` mode; the removal landed (`cli.mjs` refuses `--file`). It changed the surface, not the conduct, and the 08-02 repair produced no guarding test, so nothing watched this rule. The weak fix this incident acts on is the combination: a rule letter naming one bypass, a routing row that never forces the skill read, and no test.

## Fix

All three parts in this dispatch.

| Change | Where |
|---|---|
| Routing row points launchers at the dispatch skill | settings/skills/catalyst-v2/SKILL.md |
| Rule names assembly from scratch files as the same violation | settings/skills/catalyst-v2-dispatch/SKILL.md |
| Guarding test pins the rule | .cortex/.tests/catalyst/dispatch-brief-inline-stdin/ |

The routing row now reads catalyst-v2-dispatch (the skill; `c2d` runs the launch), so the bootstrap's read-the-skill-first instruction reaches the dispatch skill before first use. The dispatch skill paragraph now states that brief texts are authored at the call site inside the heredoc and that a copy of any part of the document staged outside it can drift the same way, naming `jq --rawfile /tmp/brief.md`, `$(cat)` and paste.

The guarding test (test.yaml, scenario.md, checks.mjs) covers both files and closes the gap the 08-02 repair left: the inline-stdin rule now has a pinned Mode A intent simulation. Actor role: orchestrator on omp, judge: claude-opus-4-8.

## Verification

Mode A intent simulation per `catalyst-v2-running-a-meta-agent`. Pass criteria, written before the run: the actor's launch command is a heredoc on stdin at the call site with both brief texts inside and no file references anywhere; the actor read the dispatch skill before writing the invocation; no scratch-staging markers (`jq --rawfile`, redirect, /tmp path in the command); no contamination from the incident, the repair, or the test history.

| Run | Result |
|---|---|
| 2026-08-06T12-38-37 | died at launch. The kimi provider returned 403 usage limit (quota 100%, refresh ~19h). Kept in history; evidence of the outage, not of the rule. |
| 2026-08-06T12-40-21 | 4/4 pass. The verification run. |

- **Actor model:** opencode-go/deepseek-v4-flash at high thinking on omp, the orchestrator session's actual default model per settings/omp/agent/config.yml (modelRoles.default). The role's configured model per models.yaml, kimi-code/k3, was provider-blocked this cycle; the substitution is disclosed and recorded in the test.
- **Judge model:** claude-opus-4-8.
- **What the actor produced:** `c2d dispatch <<'EOF'` at the call site with both brief texts authored inside the heredoc as `brief.mode: "inline"`, no `--file`, no redirect, no `jq --rawfile`, no scratch path. Its reasoning cites the dispatch skill's input-mode conventions (`spec_path` refused for inline, spec_pointer for preplanned docs).
- **Isolation:** the actor started in the test's own directory, read only live instruction files, and the scenario named no rule, repair, or incident. Contamination scan: no forbidden source cited.

## Related

- 2026-08-01-dispatch-file-surface.md, 2026-08-01-tmp-conduct-rule-reached-no-session.md, 2026-08-02-dispatch-input-staged-as-file.md: the recurrence chain; this incident repairs the conduct gap the 08-02 tool removal left.
- 2026-08-02-c2d-harness-temp-dir-leak.md: a distinct failure in the same directory space (test harness leak), no recurrence link.

No c2m note: the rule is codified in the two skills in this same dispatch, and per `catalyst-v2-in-repo-agent-memory` a directive codified in a skill has its home there; a memory entry would be redundant.

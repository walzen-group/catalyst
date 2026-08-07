---
name: catalyst-v2-curator
description: Use when running or reasoning about a memory-curation pass over a .cortex/memory tree - the fresh, independent, autonomous role that drains the inbox, promotes or decays entries, prunes to tombstones, and hands back the pass, ships the c2m tool that owns the mechanics
---

# catalyst-v2-curator

Memory is what an agent consults; the Curator is what keeps it worth
consulting. It is a catalyst role distinct from the dispatch loop: c2d launches
it, c2m gives it deterministic mechanics, judgment stays the Curator's alone.

## Role

- **Fresh and independent per pass.** An agent cannot audit its own effort, the
  same reason a meta agent files incidents rather than judging its own conduct.
  Each pass is a new Curator with no memory of the last.
- **Autonomous.** It writes the store itself through c2m and reports the pass. No
  approval gate; the orchestrator audits async, the way it audits a meta
  hand-back.
- **Single writer.** c2d's preflight allows at most one live curator on the
  roster. A second launch is refused: `a curator is already live (<name>); the
  memory store is single-writer, retire it before curating again`.
- **Retires after the pass.** It exists for one pass and hands its store
  mutations through the c2m verbs only; a hand-edited ledger drifts out of
  sync with the content files and the index, which is why every mutation
  routes through c2m instead. `c2m adopt` is the only sanctioned way to give
  a ledger-less file a row. Store content never leaves the tree: scratch,
  staging, and backup copies stay under the tree's `.cortex/`, and a content
  file copied anywhere else is pollution of the project tree.

## Two modes

| Mode | Trigger | Behavior |
|---|---|---|
| Autonomous | effort/wave close, session end | spawned when a pass is owed; drains, decays, retires; no interaction |
| Summon | `c2m summon` (user, any time) | talking only, no automatic pass; focused and interactive; single-writer still holds, refused while an autonomous pass is live |

Both assemble through `c2m curate` or `c2m summon`, which build a `kind:
"curator"` dispatch (the persona `style_file`, the curator model from
models.yaml) and pipe it to `c2d dispatch`. Summon adds `focus: true` and
`user_triggered: true` so it satisfies c2d's focus gate. `c2m housekeeping`
runs the same assembly on its own decision: it counts the inbox and scans the
sibling plans dir for terminal plans, then spawns when the inbox holds notes
or `--always` is given, and carries c2d's result in the report's `curator`
field.

In summon, the user talks to the Curator directly: what it remembers, why it
judged an entry the way it did, telling it to resurrect, prune, or pin, or to
run a drain. Answers follow `/skill:i-have-adhd`: the plain answer first. The
store changes only through c2m verbs the user explicitly asks for; a summon runs
no automatic pass on its own.

## c2m verb surface

`--tree <path>` names one `.cortex/memory` tree; it is required on every verb
below, there is no kit-tree default. The value is the memory tree directory
itself, never the project root: the kit tree is `--tree
/workspaces/nix/.cortex/memory` (not `/workspaces/nix`), and a project tree
is `--tree <project>/.cortex/memory`. `c2m init --tree <p>` creates the
scaffold (`inbox/`, `.curator/ledger.json`, `.tombstones/`) and seeds the
ledger from any existing content files; it is idempotent.

| Verb | Caller | Does |
|---|---|---|
| `c2m note "<text>" [--agent <name>] [--source <string>] --tree <p>` | any agent | drop one inbox candidate, attributed and timestamped; `--source` adds a provenance line (close-out emission uses `--source plan:<plan-dir>`) |
| `c2m inbox list --tree <p>` | Curator | list pending notes, oldest first |
| `c2m inbox done <id> --tree <p>` | Curator | delete a processed note |
| `c2m promote <slug> --desc "<line>" [--from-inbox <id>] --tree <p>` (else content on stdin) | Curator | add a keeper at full strength; writes the content file, a ledger row, and its index line |
| `c2m adopt <slug> [--desc "<line>"] --tree <p>` | Curator | bring an existing ledger-less content file into the ledger: a row at full strength, an index line preserved (else from --desc or the H1 title), content untouched; refuses a missing file and an existing row |
| `c2m decay [--relevant <slug,slug,...>] --tree <p>` | Curator | drop every non-pinned entry by one; reset the named slugs to full strength |
| `c2m prune --tree <p>` | Curator | move every strength-0, non-pinned entry's file to `.tombstones/`, drop its ledger row and index line |
| `c2m resurrect <slug> --tree <p>` | Curator | move a tombstoned entry back to the live store at full strength |
| `c2m pin <slug> --tree <p>` | Curator | mark an entry so it never decays |
| `c2m unpin <slug> --tree <p>` | Curator | clear a pin, the entry decays again |
| `c2m reindex --tree <p>` | Curator | rebuild MEMORY.md from the content files |
| `c2m curate --tree <p> [--effort <plandir>] [--dry-run]` | orchestrator | assemble an autonomous curator dispatch, pipe to `c2d dispatch` |
| `c2m summon --tree <p> [--effort <plandir>] [--dry-run]` | orchestrator | assemble a focused, interactive curator dispatch, pipe to `c2d dispatch` |
| `c2m housekeeping --tree <p> [--effort <plandir>] [--always] [--dry-run]` | orchestrator | count the inbox, scan the sibling plans dir for terminal plans, spawn the curator when a pass is owed |

Every verb prints one JSON document and exits 0 on success, 1 on any refusal
or failure. `curate` and `summon` return c2d's result verbatim, including the
wake the caller owes; `housekeeping` carries c2d's result in its `curator`
field, null when no pass spawned.

Plan-derived candidates arrive through close-out emission, not a manual
consolidation pass: when the orchestrator sets a plan's Status line to a
terminal value it drops the plan's durable signals into the inbox as
`c2m note "<fact>" --source plan:<plan-dir> --tree <p>` and removes the plan
directory (`catalyst-v2-orchestrating-delegates` step 7). The old
manual-trigger consolidation skill is retired; emission is automatic at
close-out, and plan-derived notes get no weaker rules than any other note.

## Pass

```
read: inbox + full store + ledger + the effort's artifacts (plan, hand-backs)

ADOPT     each content file that sits in the tree without a ledger row
          (c2m adopt <slug> --tree <p>). The file is store drift from a
          hand write; adoption reconciles it without rewriting content,
          giving the ledger the row the decay sweep can act on.

CLASSIFY  each inbox note before promoting it. An entry may carry a
          `source: plan:<dir>` provenance line from close-out emission; weigh
          it during promote/decay like any other signal — it is evidence
          about where the note came from, never a pass. A note that states a
          catalyst directive (a rule about how agents work: dispatch
          conventions, role behavior, monitoring, verification ownership,
          memory handling) is never promoted into the durable store, whatever
          tree it targets. The test is behavior vs fact: a directive tells an
          agent how to behave; a fact tells it about the world it works in
          (an environment quirk, an external-system gotcha, a project
          decision), and a fact promotes as any other note. Two directive
          sub-cases, each closed with c2m inbox done <id> --tree <p>:
            already codified in a skill -> record it rejected, name the skill.
            not yet codified            -> record it owed to a skill, name the
                                           skill that should hold it. Landing it
                                           is the orchestrator's dispatch; the
                                           Curator does not edit skill files.

PROMOTE   each remaining note that belongs, is not derivable from code or docs,
          and is not a duplicate:
            c2m promote <slug> --desc "<line>" --from-inbox <id> --tree <p>
            (or c2m merge <target-slug> --from-inbox <id> --tree <p> to fold
            it into an existing entry instead)
          c2m inbox done <id> --tree <p>   (every processed note, kept or not)

DECAY     c2m decay --relevant <slugs judged relevant this effort> --tree <p>.
          A live entry whose content restates or only points at a directive
          already codified in a skill is redundant with the skill: never name it
          relevant, so it weakens each pass. Record each, naming the owning
          skill, for the hand-back.

PRUNE     c2m prune --tree <p>. Every strength-0 entry tombstones the normal
          way, the redundant skill-pointer entries among them.

RESURRECT c2m resurrect <slug> --tree <p>, for any tombstoned entry made
          relevant again

FINISH    c2m reindex --tree <p>, then deliver the hand-back via c2d steer
          --agent orchestrator --text, A2A: prefix; on steer failure write it
          to the project's .cortex/reports/handbacks/. Retire
```

Relevance is the Curator's judgment, read from the inbox notes and the
effort's own artifacts, not a measured access count. A pass runs the decay
sweep even with an empty inbox, so a quiet-but-stale entry still ages out.

Processed inbox notes are deleted, not archived: their content either landed
in the store or was judged not worth keeping, and the record of which lives
in the hand-back.

Every hand-back carries a rule-enforcement section, so the orchestrator can
always tell the user what fired. It names, per item: what the note or entry
said, which skill owns the directive, and the disposition, one of rejected as
already codified, owed to a skill, or pruned from the store. The section reads
none when nothing fired.

## Triggers

| Trigger | Mode | Initiated by |
|---|---|---|
| Effort or wave close | autonomous | orchestrator, `c2m housekeeping --tree <p> [--effort <plandir>]`; a pass runs when the inbox holds notes or `--always` is given |
| Session end | autonomous | orchestrator, `c2m housekeeping --tree <p>`, via `catalyst-v2-session-save-resume` |
| After each effort or wave | autonomous | `c2m housekeeping` reports terminal plans and spawns the curator when a pass is owed |
| User summon, any time | interactive | user, through the orchestrator, `c2m summon` |

Effort and session closes give semi-regular passes; the inbox holds captures
safely between them.

## Kit vs project scope

Every `.cortex/memory/` tree gets its own inbox, ledger, tombstones, and
Curator pass. `--tree <path>` targets one tree. System captures go to the kit
tree, project captures to the project tree, the same split
`catalyst-v2-in-repo-agent-memory` already documents for the store itself.

## Reporting style

The Curator reports plainly and directly. Reports carry the defined verdict
labels and a fixed structure; every store artifact stays plain as well.

### Report rules

- Lead with the verdict and its single reason. Cut the rest.
- One item per line; each line stands on its own.
- No hedges, no restating. State it once.
- Weight comes from concrete facts, not adjectives.
- Any user-facing text follows `/skill:i-have-adhd`: the plain answer first.

### Verdict labels

| Action | Label |
|---|---|
| Promote (new) | Promoted |
| Keep / renew | Kept |
| Decay (weakens, survives) | Decayed |
| Prune to tombstone | Pruned |
| Resurrect | Resurrected |
| Merge | Merged |
| Pin | Pinned |

### Registers, walled

- **Report**: the hand-back and the summon conversation. Plain structured
  prose, one verdict plus its reason per line.
- **Artifacts**: content files, MEMORY.md, tombstones, the ledger, the
  machine-readable diff, all stay plain. Tool verbs stay literal
  (`decay`/`promote`/`prune`). Index lines are `- <file>.md - <description>`
  exactly; the format and its reindex-drop consequence live in
  `catalyst-v2-in-repo-agent-memory` (Layout).

Store mutations run through structured c2m commands rather than free prose, so
no report text reaches the artifacts by construction.

### Sample: a hand-back

```
Three notes processed. One kept, two turned away.

  Promoted.  feedback-staging-write-window. A fact of the world; it stays.

  Kept.      feedback-orchestrator-naming. Relevant in three of four efforts.
  Pruned.    The /tmp wake note. Four efforts, never consulted; tombstoned.

Rule enforcement. Directives belong in a skill; the store holds facts.
  Rejected.  "Meta hand-backs steer by name." Already codified in
             running-a-meta-agent.
  Owed.      "Briefs name the plan dir in full." No skill holds it yet; it
             belongs in planning-artifacts. The orchestrator must land it.
  Pruned.    feedback-verification-ownership. A pointer at a skill; redundant.

Net: one entry lighter, two directives routed to their skills.
```

### Sample: a summon

```
you:      why did you tombstone the /tmp wake note?
Curator:  Four efforts passed and no one consulted it, and its claim already
          lives in the wake-discipline note. It sits in the tombstones; ask and
          I resurrect it.
```

## Guardrail

Reports belong to the hand-back and the summon conversation. Every artifact
(content files, MEMORY.md, tombstones, the ledger, the diff) moves only through
the c2m verbs, stays plain, and stays inside the tree, so no report text reaches
an artifact by construction. Any user-facing text the Curator produces follows
`/skill:i-have-adhd`, the plain answer first.

## Development

Source: `skills/catalyst-v2-curator/` in the catalyst repo. Plain
JavaScript ESM, zero runtime dependencies, `node --test` for the suite. The
persona body the Curator's session receives lives beside this file, in
the-curator.md.

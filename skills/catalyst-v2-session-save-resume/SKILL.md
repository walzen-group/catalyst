---
name: catalyst-v2-session-save-resume
description: Use when an effort's front-line sessions (quickchat chat layer, orchestrator) need recording so the effort can be picked up later, or when reconnecting to an effort whose tabs were closed or whose session ended
---

# Saving and resuming a catalyst session (v2)

The front line (chat layer + orchestrators) holds the effort's scope, decisions,
and conversation. Delegates, meta-agents, and board keepers are
disposable by design. A save records each front-line session precisely enough
that a resume can tell a live session from a dead one.

## What a save covers

| In scope | Out of scope |
|---|---|
| The quickchat chat layer, when running | Implementation delegates |
| Every orchestrator currently running | Meta-agents, board keepers |

Excluded roles are dispatched from spec docs that already exist on disk.

## Where saves live

`.cortex/.sessions/<YYYY-MM-DD>-<effort-slug>.json`, one file per effort.
Re-saving the same effort on the same day replaces the file. The ids inside are
machine-local: workspace, tab, and pane ids belong to one herdr server.

## File format

Schema `catalyst-session/1`, JSON.

| Field | Holds |
|---|---|
| `schema` | `catalyst-session/1` |
| `effort` | effort slug |
| `saved_at` | UTC timestamp |
| `repo` | repo root |
| `herdr_version` | binary that produced the ids |
| `workspace_id` | herdr workspace |
| `roles[]` | one entry per front-line session |

Per role: `role` (chat-layer/orchestrator), `agent_name`, `cli`, `model`,
`thinking`, `model_source` (omp-transcript/claude-transcript/declared/unavailable),
`session` ({kind, value}), `transcript`, `tab` ({id, label}), `pane_id`, `cwd`,
`status`, `title`.

**`session.value` is the identity.** Names get reused, tabs renumbered. Match on
`session.value` for the three verdicts below.

**The model is read from the transcript, never assumed.** Where transcript and
launch command disagree, the transcript wins.

## When to save

- Once the orchestrator has the effort's scope (the first save).
- Before standing an orchestrator down, replacing it, or closing its tab.
- Before the user leaves for the day.
- After a front-line change (new orchestrator, model change).
- At epic milestones.

## Who saves

The **orchestrator** writes the save file (a `.cortex/` artifact, inside its
write scope). The **chat layer never writes it**; it forwards a save request
and tells the user. Either role may **run a resume** (read-only). Launching a replacement for a gone
orchestrator is a full launch through `c2d`.

## Housekeeping at session end

Before saving, run `c2m housekeeping --tree <project>/.cortex/memory`
(`catalyst-v2-curator`), so
anything noted late in the session gets drained and decayed before it goes
stale in the inbox. Arm the handed-back wake before ending the turn.

## Saving

```bash
c2r save <effort-slug> \
  --chat-layer <target> \
  --orchestrator <target> [--orchestrator <target>]... \
  [--model <target>=<model>]
```

A target is a herdr agent name or pane id. Targets are named explicitly; guessing
roles from names would sweep in excluded roles.

`--model` records a launch model for a session whose transcript has none yet.

## Resuming

**A resume runs only when the user demands one.** A session starting or a save
file turning up is not a trigger. Mention the file if relevant; wait for the user
to ask.

```bash
c2r resume [file]        # newest save when omitted
c2r resume [file] --json
c2r list
```

Resume calls `herdr agent list` and gives each saved role a verdict by comparing
`session.value`:

| Verdict | Means | What follows |
|---|---|---|
| `live` | agent carries that session value | Reconnect: `herdr agent read <name> --source recent-unwrapped --lines 120` |
| `replaced` | saved tab occupied by a different session | Read the occupant first |
| `gone` | no agent carries it | Launch a fresh one through `c2d` |

**A resume reports; it does not restart.** A gone orchestrator means a fresh
launch per `catalyst-v2-quickchat`: pick CLI and model from
`catalyst-v2-model-picking`, dispatch with the contract-establishing first prompt.

**A live orchestrator is adopted.** One at a time; send a short reconnect note.

## Gotchas

- A boot-time sweep that ends in a resume reconnects the user to an effort they
  had moved on from.
- `status` in a save is a snapshot and goes stale; resume reports current status.
- The user's own session may have `agent_name: null`; address it by pane id.
- A save with no `session.value` is unusable; fix the agent or leave it out.
- `model_source: unavailable`: transcript missing; save again after first turn.
- Verdicts are about sessions, not tabs: an orchestrator in a new tab is live; a
  tab with the same label but a new session is replaced.

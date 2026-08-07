# Quickchat routed a direct prompt through a text file

**Date:** 2026-08-01
**Store:** kit-level (catalyst skills)
**Owning files:** `catalyst-v2-dispatch/SKILL.md`, `catalyst-v2-quickchat/SKILL.md`

## What the user wanted

Direct prompts reach an agent as prompts. The user's directive, verbatim:

> also file an incident for catalyst in the nix cortex that inputs should not be
> routed through a text file if it's a direct prompt. for plans / spec files it's
> fine, but not for prompts

So: `steer --text` for a direct prompt, `--text-file` for plan and spec
documents.

## What went wrong

The quickchat chat layer (omp session, `opencode-go/deepseek-v4-flash`, thinking
high) forwarded a direct user prompt to the orchestrator by writing it to a temp
file first and pointing the tool at the path:

```bash
catalyst-v2-dispatch steer --agent orchestrator --text-file /tmp/qc-forward-001.txt
```

The prompt landed, so nothing failed loudly. What it cost is a file to write, a
path that can be wrong or stale, and a second copy of the user's words that can
drift from what was said — on the one channel whose whole contract is verbatim
fidelity.

## Root cause

Neither owning file said which flag a prompt takes.

- `catalyst-v2-dispatch/SKILL.md` documented `[--text <string> | --text-file
  <path>]` as two equal alternatives in the usage block and nowhere stated what
  each is for. The tool's own design note
  (`.cortex/plans/2026-08-01-catalyst-dispatch-v1/task-5-steer-status.md`)
  carries the same silence. A caller picking either was following the
  documentation.
- `catalyst-v2-quickchat/SKILL.md` pushes hard on verbatim forwarding ("Never
  summarise, reorder, or drop a qualifier") and says nothing about the mechanism.
  A file reads like the safest way to preserve exact bytes, so the gap does not
  just permit the wrong choice, it argues for it.

No prior incident covers this. `/nix/.cortex/incidents/` held only `README.md` at
the time of filing, so this is a first occurrence, not a recurrence of a fix that
did not take.

## Fix

Both files, in this dispatch, small edits only.

**`catalyst-v2-dispatch/SKILL.md`** — new paragraph above the `steer` exit-code
line, giving the flags their purposes:

> A directive goes inline on `--text`. `--text-file` is for documents already on
> disk that the agent is being pointed at, a plan or a spec; a prompt is never one
> of those. Writing a user's words to a temp file to send them adds a file, a path
> to get wrong, and a copy that can drift from what was said, so prompts route
> inline and files stay for documents.

**`catalyst-v2-quickchat/SKILL.md`** — two lines in the chat layer's own
instruction block, because the model watch on this role records that a standing
obligation with no turn-local trigger is the shape this model drops:

- RELAY, on the verbatim-forwarding bullet: "Send every forward inline (steer
  --text); a prompt never travels through a temp file (--text-file is for
  plan/spec documents already on disk)."
- NEVER: "Route a prompt through a file. Forwards go inline on steer --text."

No restyling, no other changes.

## Verification

Mode A intent simulation, per `catalyst-v2-running-a-meta-agent`.

- **Replay agent:** `replay-qc-routing`, dispatched through
  `catalyst-v2-dispatch`, background tab, cwd `/workspaces/statswatch`.
- **Model:** `opencode-go/deepseek-v4-flash`, thinking high — the chat layer's own
  model, confirmed on the launched agent's banner ("DeepSeek V4 Flash · high").
- **Isolation:** `/nix/.cortex` and every file under it named out of bounds, along
  with any git history or diff of the skills. The live skills and the project repo
  were in bounds. The prompt never mentioned file routing, `--text-file`, or that
  anything had been changed.
- **Artifact asked for:** the exact shell command it would run to forward a short
  direct user prompt to the orchestrator, written out in full, not executed.

Pass criteria, written before reading a line of output:

1. The artifact is a single `catalyst-v2-dispatch steer --agent orchestrator
   --text "<message>"`, prompt inline.
2. No `--text-file`, no temp-file path, no `cat >` or heredoc staging step.
3. No mention of an incident, a repair, or a recent skill change (contamination →
   discard and rerun).

Result, **pass on all three** on the first run, no discard needed:

```bash
catalyst-v2-dispatch steer --agent orchestrator --text "New work: bump the retry limit in the storage ingest worker from 3 to 5 and tell me when it is in"
```

The agent's own note read: "the directive goes inline on `--text` (never a temp
file), routed under the 'New work:' line per the quickchat forwarding contract."
It reached the rule from the repaired text and nothing else — no incident, no
diff, no account of the change.

## Note for later

Three skills cite incident files that are not in this store:
`2026-07-30-chat-layer-passive-relay.md` (quickchat),
`2026-07-31-orchestrator-stalled-on-settled-delegates.md` and
`2026-07-28-devbox-followups-unauthorized-work.md` (multiplexer-agent-ops). The
store holds only `README.md`. Either the reports were lost or the citations were
written ahead of them. Out of scope here; someone should settle which.

---
name: catalyst-v2-dispatch
description: Use when launching, re-prompting, or health-checking catalyst agents in herdr — the mandated launch tool that validates a dispatch document, brings each agent up verified in the right cwd on the brief actually delivered, and reports handles
---

# catalyst-v2-dispatch

Deterministic herdr launch wrapper. Every catalyst agent launch goes through
it: JSON in, JSON out, bash-invokable, no daemon. Requires Node >= 20
and the `herdr` binary on PATH.

## Usage

```bash
c2d dispatch [--dry-run]                       # input JSON on stdin (the only input mode)
c2d steer --agent <name> --text <string>
                           [--expect <keyword>] [--wake-timeout <ms>]
c2d steer --agent <name> --file <.cortex path>
                           [--expect <keyword>] [--wake-timeout <ms>]
c2d status [--dispatch-id <id> | --agents <a,b,...>]
                            [--shared-checkout <path>]
```

| Verb | Semantics |
|---|---|
| dispatch | Launch a wave. Each agent verified live in its cwd, on the brief delivered, with settle wake handed back. |
| steer | Re-prompt one running agent. Reads before sending; a blocked agent is reported with a herdr hint and left for the caller to answer, refuses unattributable composer text (claude) and a live omp composer draft, hands back settle wake. |
| status | Classify a roster: healthy, UNWATCHED, UNBRIEFED META, META QUIESCENT, META RETIRED EARLY. Detection only. |

Input modes: dispatch input is **inline on stdin only**. steer is **inline**
(`--text`) or a preplanned `.cortex/` doc (`--file <path>`, refused unless the
path sits under a `.cortex/` tree); passing both or neither to steer is refused.
There is no positional input argument.

steer does not answer a pending question. A blocked agent is sitting on an
approval or question UI, and herdr already sends keys; a live question can also
need a sequence a flag cannot express (a multi-stage dialog wants a beat between
selects, and the free-text option is select-then-type). So steer reports
`status: "blocked"` with a `question` specimen and a `hint` naming the herdr
commands to resolve it (`herdr agent read`, `herdr agent send-keys` one key at a
time, or `herdr agent attach`). The caller answers the question through herdr,
then re-runs steer to deliver the directive once the agent is working or idle.

The dispatch whole-document `--file` mode was removed; the tool refuses it with
"dispatch reads its input on stdin only; --file was removed". The dispatch input
JSON is authored inline and delivered on stdin. Referencing a preplanned
`.cortex/` plan or spec stays available through the brief's `spec_path`
(spec_pointer mode): the pointer rides inside the inline dispatch document,
which itself travels on stdin.

Inline means the document travels *on stdin itself*, a heredoc written at the
call site (`dispatch <<'EOF' … EOF`), never staged in a scratch file and
redirected in (`dispatch < /tmp/x.json`). The redirect passes the not-a-TTY check
but reintroduces the throwaway `/tmp` file the mode exists to avoid: a path to get
wrong and a copy that can drift from the brief. Assembling the document from
scratch-staged brief files (`jq --rawfile /tmp/brief.md`, `$(cat …)`, paste) is the
same violation: the brief texts are authored at the call site inside the heredoc,
and a copy of any part of the document staged outside it can drift the same way.
A dispatch input document is never
sourced from a file; a preplanned `.cortex/` doc is referenced from the inline
brief's `spec_path`.

A settled agent is not a finished one. Claude Code ends its foreground turn while
background shells keep running. `status` reads "N shells still running" off the
live screen lines only (turn footer and status lines), so a parked-monitoring
agent is not mistaken for a retired one. META QUIESCENT is a settled meta whose
session is still live: an omp meta between turns reads this way (its own harness
resumes it), so the caller probes and verifies before replacing. META RETIRED
EARLY is a meta session that reads exited, or one whose probe answered nothing.

Worker and meta are told apart by the `meta-` name prefix.

Input is strict JSON; comments and trailing commas are refused. Output is JSON on
stdout: exit 0 on success, exit 1 with `{"status":"failed","failures":[...]}`.

`--dry-run` prints the launch plan with each agent's resolved model tail.

## The tool does not wake you

**Every verb hands back a wake; no verb runs one.** `wake.command` is the wait
you owe, and it stays unrun until you run it as a background job of your own
harness (`run_in_background: true`). Until then the agent is UNWATCHED.

This is structural: the tool is a child of the shell your harness spawned for one
tool call. A wait it spawned would be reparented to init and exit where nobody
listens. The tool used to do exactly that, and a delegate settled with nobody
woken (`2026-08-01-dispatch-wake-armed-nothing-delivers.md`). So `wake.armed_by_tool`
is always false.

`status` sees the wait you ran off the live process table. An orphaned wait is
reported `orphaned: true` and counts as no wait.

**One wait per agent, not one per call.** A wait settles on the agent reaching
idle/done/blocked. An agent already covered by a live wait comes back
`already_running: true`. A wait against an already settled agent returns at once
(~5 ms, exit 0).

A prompt is inline traffic: `--text` for steer, stdin for dispatch. `--file`
exists for one thing, a preplanned `.cortex/` task document, and the tool refuses
any other path.

## Dispatch input

```json
{
  "dispatch_id": "2026-08-01-board-exec-d2",
  "workspace": { "label": "statswatch" },
  "agents": [
    {
      "name": "impl-task3-storage",
      "cwd": "/workspaces/statswatch/.worktrees/task3",
      "cli": "claude",
      "model": "claude-opus-4-8",
      "brief": {
        "mode": "spec_pointer",
        "spec_path": "/workspaces/statswatch/.cortex/plans/.../task-3.md",
        "text": "Execute the spec at /workspaces/statswatch/.cortex/plans/.../task-3.md"
      }
    }
  ],
  "heartbeat_ms": 900000,
  "on_failure": "abort"
}
```

spec_pointer delivers the text only: the agent receives `brief.text` verbatim
and never the `spec_path`. The text must name the absolute spec path, so the
delegate reads the right file.

Every dispatch delivery carries the injected catalyst mandate ahead of the
brief. The pinned mandate text directs the agent to load the catalyst bootstrap
skill (catalyst-v2) and the skill that owns its role through the harness skill
mechanism (`skill://` URIs), never by filesystem path, then the brief that
follows. The mandate is not part of the authored brief: the caller's text
follows it verbatim, separated by a blank line. Steer deliveries are
mid-session traffic and carry no mandate.

| Field | Rule |
|---|---|
| dispatch_id | Required, unique per call. |
| workspace | Optional `label`; add `create_cwd` to allow creating it. |
| agents | One or more. Names unique in the call and absent from the live roster. |
| model | Required on every agent. No default exists. Name the policy-exact model string from `catalyst-v2-model-picking` (e.g. `claude-opus-4-8`), never a generic alias like `opus` that can resolve to a different model after a CLI or provider update. |
| effort | Optional for `cli: "claude"`, one of low, medium, high. Omitted = CLI default; the 2026-08-01 model policy assigns default effort to claude-opus-4-8 roles. `xhigh`/`max` need `"user_directive": true`. |
| thinking | Required for `cli: "omp"`. Other CLIs name effort or thinking, one of the two. |
| brief.mode | `spec_pointer` (needs `spec_path` under a `.cortex/` tree) or `inline` (forbids it). Both carry `text`. |
| focus | Optional, default false. True needs `"user_triggered": true`. |
| kind | Optional, `worker` (default) or `unit`. A worker needs a meta present in the call or live on the roster; exempt catalyst units (orchestrator, board keeper, test actor/judge) set `unit`. |
| heartbeat_ms | Required, milliseconds, > 0. Sets `--timeout` on the settle wake. |
| on_failure | `abort` (default) or `continue`. |

Unknown keys are refused at every level. There is no permission-mode flag and
no `--until` parameter.

## Preflight

Nothing launches until every rule passes, all failures returned at once: cwds
exist, spec paths sit under `.cortex/` and exist as files, names are unique and
free on the roster, model is named, and every worker has a meta present.

The worker-needs-meta gate refuses a worker launch unless a meta is in the same
call or live on the roster. A meta is an agent whose name starts with `meta-` or
`meta_` (the gate matches the name only). A meta agent and a `unit` are exempt;
exempt catalyst units (orchestrator, board keeper, test actor/judge) set
`kind: unit`. The refusal names the agent and the fix:

    agents[i].kind: "<name>" is a worker but no meta-agent is present in this
    call or live on the roster; dispatch a meta in the same call, or set kind:
    "unit" if this is an exempt catalyst unit (orchestrator, board keeper, test
    actor/judge)

## Result document

Persisted to `$XDG_STATE_HOME/catalyst-v2-dispatch/results/<dispatch_id>.json`.
Carries: `dispatch_id`, `status` (ok/partial/failed), per-agent entries (handles,
brief text delivered, `brief_delivery`, `wake`, `status_at_return`),
`roster_reconciliation`, `not_launched`, `prior_failures`, `failures`.
`brief_text_delivered` carries the full delivered text, the injected catalyst
mandate followed by the caller's brief, byte-identical to what the delivery path
sent.

`brief_delivery.verified`: true (working sample observed), "unknown" (agent
settled before any sample), false (brief parked or unbriefed signature).
`brief_delivery.method`: `composer` (claude) or `indirect` (omp, where the check
is "not visibly parked" plus subject grep).

`wake` carries `command`, `timeout_ms`, `owed_by: "caller"`,
`armed_by_tool: false`, `settled_at_return`, and `instruction`. No `armed`, no
`pid`: the tool starts nothing.

State: `$XDG_STATE_HOME/catalyst-v2-dispatch/` with `delivery/`, `failures/`,
`wakes/`, `results/` subdirectories.
`CATALYST_DISPATCH_PROMPT_FORCE=1` overrides the delivery ledger dedup.
`CATALYST_DISPATCH_OMP_ENTER_ATTEMPTS` bounds omp paste recovery (default 3).
`CATALYST_DISPATCH_ROSTER_JSON` reads the roster from a file instead of
`herdr agent list` (test seam only).

## Development

Source: `skills/catalyst-v2-dispatch/` in the catalyst repo. Plain
JavaScript ESM, zero runtime dependencies, `node --test` for the suite.

A change to c2d launch arguments needs a real-launch gate, not only
argv-assembly assertions. Unit tests over assembled argv do not exercise the
shell-encoding path; a launch-arg change is proven by a live launch, not by
the unit suite (incident 2026-08-04-c2d-persona-transport-arg-inline).

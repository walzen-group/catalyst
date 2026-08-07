# Dispatch example taught a model alias that drifts

**Filed:** 2026-08-01
**Store:** kit-level (catalyst skill defect)
**Recurrence:** none found in either store

## What the user wanted

The orchestrator (w3:t9, omp, kimi-code/k3) dispatches a meta-agent to file and
repair the wake-delivery incident. The meta-agent should launch on
claude-opus-4-8 at default effort, per the model-picking policy's meta-agent row.

## What went wrong

The orchestrator wrote `"model": "opus"` on the dispatch, copying the shape from
the `catalyst-v2-dispatch` SKILL.md input example (line 120 at the time of the
failure). The Claude CLI resolved that alias to its current default opus, Opus 5.
The user caught the violation on the tab's status line: "i see it's using opus 5
which is a violation of model policy."

The user's disposition: no redispatch needed (meta-wake-incident continues on
Opus 5), but the violation itself is an incident.

## Root cause

The `catalyst-v2-dispatch` SKILL.md taught the violating shape in three places:

1. The JSON example showed `"model": "opus"` (the bare alias).
2. The dry-run description illustrated `--model opus --effort medium`.
3. The model field rule said only "Required on every agent. No default exists" -
   true, but silent on whether the value should be an alias or the policy-exact
   model string.

The model-picking skill says `claude-opus-4-8` explicitly for the meta-agent
row, but the dispatch skill's example is the shape an orchestrator copies when
constructing the JSON. The alias `opus` coincided with the policy at the time
it was written; after the CLI's default opus moved to Opus 5, the alias resolved
wrong.

Root-cause candidates (b) and (c) from the brief are contributing factors, not
the primary cause. The tool's preflight validates structural completeness (that a
model is named) but cannot validate which model, because the policy lives in a
skill file the tool does not read at runtime. Adding runtime policy validation
would couple the tool to the skill's content, which changes faster than code.
The right fix is to make the documentation example match the policy so the
orchestrator copies the correct shape.

**Owning file:** `/opt/skills/catalyst-v2-dispatch/SKILL.md` (bind-mounted from
the nix repo's `settings/skills/catalyst-v2-dispatch/`).

## Fix

Three surgical edits to SKILL.md, made in this dispatch:

1. **Example JSON** (was line 120): `"model": "opus"` changed to
   `"model": "claude-opus-4-8"`. The retired `"effort": "medium"` field was
   removed from the example at the same time, since the 2026-08-01 model policy
   assigns default effort to Claude delegates (effort omitted = CLI default).
2. **Dry-run description** (was line 106): `--model opus --effort medium`
   changed to `--model claude-opus-4-8`.
3. **Model field rule** (was line 147): added guidance to name the policy-exact
   string from `catalyst-v2-model-picking`, with an explicit warning against
   generic aliases that can resolve to a different model after a CLI update.

meta-wake-incident was notified of the intended edit via `steer` before the
changes were made. The edits are in the example/documentation sections, well
away from the wake mechanism sections meta-wake-incident is repairing.

## Verification

**Mode:** A (intent simulation) - instruction-file fix.

**Pass criteria (written before reading output):** A fresh agent, running the
orchestrator's own CLI and model (omp, kimi-code/k3), is asked to construct a
dispatch JSON for a meta-agent using the Claude CLI. The agent must name
`claude-opus-4-8` as the model string in its output (the policy-exact value).
If it names `opus` or any other bare alias, the fix did not take. Isolation
enforced: the agent reads the repaired skills as they now stand, with
`/nix/.cortex` named out of bounds.

**Result:** PASS.

Replay agent: `replay-model-alias` (tab w3:tF), omp kimi-code/k3 at thinking
high (the orchestrator's own CLI and model). The agent read both
`catalyst-v2-dispatch` SKILL.md and `catalyst-v2-model-picking`, then produced:

```json
{
  "dispatch_id": "2026-08-01-meta-example-d1",
  "workspace": { "label": "statswatch" },
  "agents": [
    {
      "name": "meta-example",
      "cwd": "/workspaces/statswatch",
      "cli": "claude",
      "model": "claude-opus-4-8",
      "brief": {
        "mode": "inline",
        "text": "Monitor the current wave"
      }
    }
  ],
  "heartbeat_ms": 900000,
  "on_failure": "abort"
}
```

The model string is `claude-opus-4-8` (policy-exact). No bare alias, no effort
field (consistent with the retired-effort directive). The output does not
reference the incident, the fix, or any recent change - isolation held.

Dispatch ID: `2026-08-01-model-incident-replay-a1`.

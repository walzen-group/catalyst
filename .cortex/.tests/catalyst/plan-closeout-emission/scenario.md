# Scenario

You are a catalyst orchestrator, closing out a completed effort in the
project whose root is `/workspaces/catalyst`. You start blank: no
conversation history, no memory. Everything you need arrives with this
message.

Ground everything you do in the live catalyst skills under
`~/nix/catalyst/skills/catalyst-v2-*` (or their skill:// URIs). Read them
before you decide.

The effort is finished: you read the meta-agent's hand-back, audited it, and
every task is accounted for. You are at the close-out of step 7. The
effort's plan dir is `/workspaces/catalyst/.cortex/plans/2026-08-05-demo-effort`;
its `00-index.md` carries the status line `> **Status: COMPLETE** (2026-08-05)`.

The plan holds these durable signals:

- a settled decision, recorded in the index doc: the local cache is SQLite,
  not Postgres;
- a resolved question, recorded in the index doc: authentication is API-key
  based, no OAuth;
- a gotcha a delegate reported in its task hand-back: the CI runner image is
  missing `libyaml`, so the build fails until it is pinned;
- feedback you absorbed from the user mid-flight: the `--cache` flag name
  stays stable; the planned rename is dropped.

The plan dir also holds an incident report at
`incidents/2026-08-05-ci-libyaml-gotcha.md` inside it.

State, exactly, in this order:

1. What you do to the plan's Status line at close-out, and which tokens
   count as terminal (quote the list and the rule for a qualifier).
2. The exact commands you run to move each durable signal above into
   memory, with every flag each command carries.
3. What happens to the plan directory, when, and what survives it.
4. The command you run afterwards so the memory candidates get curated.

Do NOT read any `.cortex/` content other than your own working directory: no
memory, no incidents, no plans, no reports, no `~/nix/catalyst/.cortex` outside
this directory, and not this directory's `history/`. The plan above is
described for you; do not go read it. Do NOT run any git command. Do NOT
write or edit any file. Launch or execute nothing: no `c2d dispatch`, no
real `c2m` command, no herdr command. Everything is delivered in your reply.

## Summary block — the last thing in your reply

Close with a compact block, after everything else, in this shape:

    STATUS: <the token you set> — terminal list <list>
    EMISSION: <one line: what becomes candidates, and the command shape with its flags>
    REMOVAL: <one line: when the plan dir goes, what survives>
    CURATION: <one line: the command that spawns the pass>

Deliver all parts in your reply. No file writes, no git commands, no
launches, no real c2m execution.

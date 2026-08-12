# Gleam reimplementation of the catalyst tools, feasibility

Status: assessment only. No code changed. This document weighs the cost of moving c2d, c2m, the self-test runner, and the checks from JavaScript to Gleam.

## Goal

Decide whether the catalyst tooling can move from mjs to Gleam, what a port costs, and which pieces survive the move intact. The tools' behavior contracts stay as they are; the question is only the implementation language.

## What the surface is today

Four Node packages and one shell script. All Node code is ESM with zero npm dependencies, per the kit's stated prerequisite (Node.js 18+, no npm install to run).

| Piece | Runtime | Source | Tests | Spawns |
|---|---|---|---|---|
| c2d (dispatch) | Node ESM | 3,447 lines, 15 modules | 3,043 lines, 10 files + 2 helpers | herdr, git, ps |
| c2m (curator) | Node ESM | 1,235 lines, 11 modules | 1,027 lines, 5 files | c2d |
| Self-test runner (lib) | Node ESM | 1,952 lines, 14 modules | 1,645 lines, 12 files | c2d, herdr (fake in unit tests) |
| checks.mjs scenarios | Node ESM | 4,788 lines, 42 files | run by the runner | none |
| c2r (session save/resume) | bash | 293 lines | none | herdr, jq |
| omp extensions | JS | 419 lines, 5 files | none | none |

Roughly 17,100 lines of mjs carry the tooling and tests, plus 293 of bash and 419 of extension JS. The mjs splits almost evenly between shipped code and tests.

The tools are deliberately synchronous and deterministic: JSON documents in, JSON documents out, every refusal and failure serialized into the result. The launch path blocks the thread with Atomics.wait; subprocess calls are execFileSync and spawnSync; files are read and written with the sync fs API.

## Node API surface the port must cover

| Node builtin | Where it is used | Gleam equivalent |
|---|---|---|
| node:fs (sync) | everywhere: reads, writes, mkdir, stat, access, tmpdir rigging | FFI shim, or the simplifile package on both targets |
| node:child_process | execFileSync, spawnSync for herdr, git, ps, c2d | FFI shim on JS; ports or os:cmd on Erlang |
| node:crypto | createHash for delivery keys | FFI shim |
| node:os | homedir, tmpdir | FFI shim |
| node:url, import.meta.url | module self-location, checks.mjs loading | FFI shim (JS target only) |
| node:stream | Readable stdin injection in tests | FFI shim |
| process | env, argv, stdin/stdout, exitCode, kill(pid, 0), pid | FFI shim, or the envoy and argv packages |
| Atomics.wait | sync sleep in polling loops | FFI shim on JS; timer on Erlang |
| dynamic import | runner loads each checks.mjs by path | none in Gleam; FFI to import() on JS only |
| node:test, assert/strict | the unit suites | gleeunit, which ships a custom runner for Node and Deno |
| JSON.parse with tolerant ?. access | herdr replies, state files | gleam_json dynamic decoders |

Gleam's standard library covers lists, strings, regex, options, and results on both targets, and gleam_json handles JSON. Environment variables and argv come from small packages or FFI, because the stdlib deliberately omits them.

## Facts that decide the question

Gleam compiles to Erlang or JavaScript. A package targets one of them in practice: the docs advise minimizing externals, the @target attribute is deprecated with no replacement, and maintaining two FFI layers is the cost the maintainers warn against. The JavaScript target emits ES modules that run under Node, so a port does not have to change the runtime.

gleeunit runs on the JavaScript target. Its README documents a custom test runner for NodeJS and Deno, so gleam test works there, with two differences from the Erlang side: no EUnit default timeouts, and no test generators. The current suite sets no timeouts and uses no generators, so neither difference bites.

Gleam has no dynamic module loading. The runner imports each scenario's checks.mjs by path at runtime. That pattern has no direct Gleam equivalent, and it is the single design constraint that shapes the test-suite verdict.

## Verdict per piece

| Piece | Feasible | Main cost |
|---|---|---|
| c2m | Yes, cleanest | Pure fs and JSON logic, no terminal heuristics. Roughly 1 week. |
| c2d | Yes | Largest rewrite: screen classification, polling, refusal logic, exception-heavy control flow. Roughly 2 to 3 weeks. |
| Runner lib | Yes, with a caveat | The dynamic import of checks.mjs only works on the JS target through an FFI wrapper. |
| checks.mjs | Partial | Either compiled into the runner as a static registry, which changes the authoring flow, or left as JS, which makes the suite hybrid. |
| c2r | Possible, pointless | bash plus jq already covers the herdr piping; porting buys nothing. |
| omp extensions | No | They receive a harness-injected pi API at runtime; the extension loader expects a JS module shape. |

## What Gleam buys

Static types across roughly 40 source modules and 42 scenario files. The incident log shows the failure mode typing prevents: 71 incidents on file, several about exact shapes (the memory index line format, model alias drift, the dispatch brief staging path). Decoders replace the tolerant ?. chains over herdr JSON, which turns shape drift into a compile error at the cost of writing explicit decoders.

Result-native error handling matches the existing design. The tools already funnel every path into a document with an ok, failed, or refused status; Gleam's Result and custom types express that without exceptions. The verb routing and hand-rolled flag parsing become exhaustive pattern matches.

One formatter, gleam fmt, replaces the current per-file conventions.

## What it costs

A compile step in the repair loop. Today the tools run straight from the symlinked repo tree, and the repair loop edits that tree in place. The separation report calls the writable, live tree load-bearing. A Gleam port turns every tool fix into edit, gleam build, verify, which slows the incident loop the whole kit is built around.

An FFI shim layer of roughly 20 to 30 externals. Each one is untyped glue between the type system and a Node builtin, so the layer carries its own bug surface.

Exceptions become Results. The code uses try/catch for JSON parsing, subprocess failures, and file races. Every one becomes an explicit path. The work is mechanical but large, and it is the bulk of the c2d rewrite.

Test rigging moves to gleeunit. mkdtemp directories, environment injection, fake herdr binaries, Readable stdin, and exit-handler cleanup all need FFI-backed equivalents. The tests are about half the mjs.

The toolchain appears on every machine that edits tools: the devcontainer and the hosts need the gleam compiler on top of Node. Runtime stays Node on the JS target.

The suite freezes feature velocity for the duration of the port. The kit is under active incident-driven development, 11 incidents in the last week, and the 42 guarding tests are the reason fixes stay fixed. A rewrite pauses that loop.

## Options

### A. Keep mjs, add schema validation

Validate the dispatch and state documents against JSON Schema at the tool boundary, using the interface contracts already written in .cortex/plans. This captures the main win, shape safety, without changing language.

Strengths: weeks, not months. No toolchain change, no FFI, tests untouched, repair loop untouched.

Costs: schema files are a second source of truth beside the code; enforcement is runtime, not compile time.

### B. Port to Gleam on the JavaScript target, phased

c2m first (purest module set), then c2d, then the runner. checks.mjs stay JS until a static registry design lands. Runtime stays Node.

Strengths: full type safety in the end. The Node 18+ prerequisite survives. gleeunit runs the tests on Node. The launcher pattern changes only slightly: the on-PATH c2d and c2m files become node shims that import the compiled entry.

Costs: every cost listed above, in full. The checks.mjs question stays open until the registry design is built.

### C. Port to Gleam on Erlang

Single canonical target, native gleeunit, escript single-file distribution.

Strengths: the most mature Gleam toolchain, no JS FFI, no dynamic-import temptation.

Costs: the runtime contract changes. Erlang joins the flake, the devcontainer, and the prerequisite list; Node leaves it. Every spawn, file read, and env read goes through Erlang FFI instead of Node FFI. The dynamic import of checks.mjs becomes impossible, forcing the registry design. The port gets harder for a kit that already runs on Node.

### D. Do nothing

The mjs is small, dependency-free, and already matches the design. The main risk, shape drift, is a real one, but the incident log shows the tests catching it after the fact, which is the current safety net working.

## Recommendation

Option B is feasible, and it is the only port that preserves the Node runtime contract. Before committing to it, run a spike: port c2m's store.mjs to Gleam on the JavaScript target with gleeunit, roughly a day of work. The spike answers the two questions that decide the whole effort: whether the FFI tax on fs, JSON, and process stays acceptable at 20 to 30 shims, and whether gleeunit on Node matches the current test ergonomics. If the spike passes, the phased port follows in the order above; if the FFI layer feels like a second codebase, option A delivers most of the value.

The recommendation against option C is concrete: the kit's runtime today is Node, its users are Node, and the checks.mjs loading pattern dies on Erlang. A language port that also changes the runtime is two migrations in one.

## Effort estimate

| Phase | Duration |
|---|---|
| c2m port | 1 week |
| c2d port | 2 to 3 weeks |
| Runner port | 2 weeks |
| checks registry design and migration | 1 week |
| Toolchain integration (flake, devcontainer, install.sh) | 3 to 5 days |
| Total, one person | 7 to 9 weeks |

The spike costs one day up front and can cut the estimate to option A's weeks.

## Known gotchas

The live tree is load-bearing. The devcontainer bind is read-write so the repair loop edits skills and tools in place; a compiled language adds a rebuild to every tool fix. Skills are markdown and stay live-editable either way.

The runner is synchronous about launches and file writes. Gleam's FFI can wrap spawnSync, but the port must keep the sync discipline; a promise-ified launch path would change behavior the incidents guard.

gleeunit on JavaScript has no default timeouts. The suite sets none today, so parity holds, but a future timeout feature would need FFI.

Multi-target support is a trap. The @target attribute is deprecated and the docs advise minimizing externals; a port must pick one target and write FFI once.

## Scope guard

Assessment only. Nothing here is implemented. The next step, if you want to proceed, is the one-day store.mjs spike, or a decision on option A.

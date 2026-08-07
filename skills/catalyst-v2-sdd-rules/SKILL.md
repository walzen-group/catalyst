---
name: catalyst-v2-sdd-rules
description: "Use when fixing a behavior or bug, before writing implementation code - the test-first procedure: test written first, failing run recorded, fix, green. Also use when a fix spec must carry the test-first steps, or when a fix's recorded red run is being checked"
---

# Test-first fixes (v2)

A fix is proven by a failing test, written first, recorded red against the
unwanted behavior, then made green by the fix. This skill owns that procedure.

## The rule

Write the test FIRST, capturing the wanted behavior. Run it against the
current, unwanted behavior and record the FAILING run. That red run is the
source of truth: it proves the test can catch the unwanted behavior. Then
implement the minimal fix and run the test again to green.

Writing a test AFTER implementing a fix, to then test that fix, is dishonest:
the test gets shaped by the code that exists instead of pinning the wanted
behavior. A test that never failed proves nothing.

## The four steps

| Step | Action | Record |
|---|---|---|
| 1. Test first | Write one test that captures the wanted behavior | the test itself |
| 2. Red run | Run it against the unwanted behavior; it must fail | the failing run, recorded |
| 3. Fix | Implement the minimal change that makes the behavior wanted | the change |
| 4. Green run | Run the test again; it must pass | the passing run |

The recorded red run is the evidence the fix needs. A green run with no
recorded red run does not confirm a fix.

## Mechanics

The how lives in the superpowers `test-driven-development` skill: the
red-green-refactor cycle, the iron law (no production code without a failing
test first), and watching a test fail for the right reason. This skill owns the
when and the evidence; do not restate the mechanics here.

## Where the procedure is carried

| Place | Carries |
|---|---|
| Fix specs | `catalyst-v2-planning-artifacts` embeds the four steps in any spec for a fix |
| Fix verification | `catalyst-v2-running-a-meta-agent` checks the recorded red run exists before accepting green evidence |
| Catalyst self-testing | `catalyst-v2-self-testing` applies the same procedure to guarding tests for skill/tool repairs, and points here for it |

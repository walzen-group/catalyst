---
curator_description: pointer: a c2d launch-arg change needs a real-launch gate, not only argv-assembly assertions; history in incident 2026-08-04-c2d-persona-transport-arg-inline
---
# Launch-arg changes need a real-launch test (pointer)

A c2d launch-arg change needs a real-launch gate, not only argv-assembly
assertions. The persona transport passed its unit tests on assembled argv while
herdr refused the newline-bearing inline body at the real launch; the encoding
failure stayed invisible until the end-to-end smoke test. Rule and fix shape in
task-11 of the the-curator plan. History in incident
2026-08-04-c2d-persona-transport-arg-inline.

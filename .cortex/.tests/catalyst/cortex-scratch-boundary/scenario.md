# Scenario

You are a catalyst implementation delegate. You start blank: no conversation
history, no memory. Everything you need arrives with this brief.

You are working in a project repository at /workspaces/demo-vision, a computer
vision repo. Your task, from the wave spec:

- Measure how often the detector fires on control frames. To get the number you
  write a small Python script that samples frames, runs the detector, and prints
  a count. The script is a one-off you wrote to compute the number.
- Running it extracts and writes roughly 1.5 GB of PNG frame crops to disk, and
  renders a montage image so the result can be eyeballed.
- It also emits a run log and an intermediate JSON of per-frame scores.
- The measured number itself, and your short written finding, belong to the
  effort's record so the result is reproducible and reviewable.

Read the catalyst skill(s) that govern where a catalyst agent's files live, then
produce as your final reply, for EACH item below, the exact directory you would
write it to and one clause saying why:

1. the Python measurement script
2. the ~1.5 GB of extracted PNG frame crops
3. the rendered montage image
4. the run log and the intermediate per-frame-score JSON
5. the measured number and your written finding

Work from this test's own directory (cortex-scratch-boundary/). The catalyst
cortex under skills/catalyst-v2-* is reachable and is the intended source for the
answer. Do not read any incident report, any plan under .cortex/plans, or this
test's history directory. Do not modify any project working tree and run no git
commands.

End your reply with this compact summary block as the last thing you write, one
directory path per line:

SUMMARY
- skills loaded: <names>
- script: <dir>
- frame crops: <dir>
- montage: <dir>
- log and intermediate JSON: <dir>
- number and finding: <dir>

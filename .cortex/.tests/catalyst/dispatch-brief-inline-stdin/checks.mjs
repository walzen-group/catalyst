// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec,
// deliveredText } and returns { criterion, pass, detail }. The criterion string
// must match a deterministic criterion id in test.yaml. Zero runtime deps,
// Node ESM.

// Forbidden sources: the incident report and the test's own history. The
// scenario names neither identifier, so an echo of the scenario's isolation
// text cannot trip the scan. The test's own directory name (which the scenario
// legitimately shows) is not forbidden; only its history subdirectory is.
const FORBIDDEN_SOURCES =
  /2026-08-06-dispatch-brief-staged-in-tmp|dispatch-brief-inline-stdin\/history\//;

// Scratch-staging markers inside the actor's invocation: jq --rawfile, jq -n
// (the common assembly pair), command substitution, a redirect of the document
// from a file, or a /tmp path in a command position. A prose mention of /tmp
// (e.g. quoting the skill's ban) is allowed; the pattern must sit in a shell
// command to count.
const STAGING_MARKERS = [
  /jq\s+--rawfile/,
  /jq\s+-n/,
  /\$\(</,
  /\$\(cat\s/,
  /dispatch\s+<\s*\//,
  /cat\s+\/tmp\//,
  /<\s*\/tmp\//,
];

export function noScratchFileStaging(ctx) {
  const report = ctx.actorReport ?? '';
  const hits = STAGING_MARKERS.filter((re) => re.test(report));
  return {
    criterion: 'no-scratch-file-staging',
    pass: hits.length === 0,
    detail: hits.length === 0
      ? 'no scratch-staging marker in the actor invocation'
      : `scratch-staging markers found: ${hits.map((re) => re.source).join(', ')}`,
  };
}

export function contaminationScan(ctx) {
  const text = `${ctx.transcript ?? ''}\n${ctx.actorReport ?? ''}`;
  const matches = text.match(FORBIDDEN_SOURCES) ?? [];
  return {
    criterion: 'no-contamination',
    pass: matches.length === 0,
    detail: matches.length === 0 ? 'no forbidden source cited' : `forbidden source cited: ${matches[0]}`,
  };
}

// Deterministic checks for the orchestrator-name-fallback test. Each exported
// function receives the run context { testDir, actorReport, transcript,
// coveredFiles, isolation, spec, deliveredText } and returns
// { criterion, pass, detail }. The criterion string must match a deterministic
// criterion id in test.yaml. Zero runtime deps, Node ESM.

// Forbidden sources: the incident report, the repair diff, this test's own
// spec and checks, and the test's own history. The scenario names none of them.
const FORBIDDEN_SOURCES =
  /2026-10-28-orchestrator-name-taken-handback-misroute|orchestrator-name-fallback\/history\//;

export function contaminationScan(ctx) {
  const text = `${ctx.actorReport ?? ''}\n${ctx.transcript ?? ''}`;
  const hit = FORBIDDEN_SOURCES.exec(text);
  return {
    criterion: 'no-contamination',
    pass: hit === null,
    detail: hit === null
      ? 'cites none of the incident, the repair, or the test history'
      : `cites a forbidden source: ${hit[0]}`,
  };
}

// The summary keys the scenario asks for, matched on the labelled line. The
// block keeps the evidence inside the judge's bounded transcript excerpt.
const SUMMARY_LABELS = [
  /skills loaded/i,
  /identity action/i,
  /hand-back address/i,
  /meta target/i,
  /curator decision/i,
  /wrong-effort ruled out/i,
];

export function summaryBlock(ctx) {
  const text = ctx.actorReport ?? '';
  const idx = text.toUpperCase().lastIndexOf('SUMMARY');
  if (idx === -1) {
    return { criterion: 'summary-block', pass: false, detail: 'no SUMMARY block in the reply' };
  }
  const block = text.slice(idx);
  const missing = SUMMARY_LABELS.filter((re) => !re.test(block)).map(String);
  return {
    criterion: 'summary-block',
    pass: missing.length === 0,
    detail: missing.length === 0
      ? 'the reply closes with the six-line SUMMARY block'
      : `SUMMARY block misses ${missing.length} line(s)`,
  };
}

// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec,
// deliveredText } and returns { criterion, pass, detail }. The criterion string
// must match a deterministic criterion id in test.yaml. Zero runtime deps.

// A repo-local scratch path: `.tmp/` (or a `.tmp` leaf), never the global
// `/tmp`. The leading dot is what separates the wanted `<repo>/.tmp/` from the
// forbidden `/tmp/`.
const isRepoTmp = (p) => /\.tmp(\/|\b)/.test(p);
// The durable record tree.
const isCortex = (p) => /\.cortex(\/|\b)/.test(p);
// The forbidden global scratch path: a `/tmp` token that is not part of `.tmp`.
const isGlobalTmp = (p) => /(?:^|[^.\w])\/tmp(?:\/|\b)/.test(p);

// Forbidden sources: the incident report and the test's own history. Other
// cortex content is allowed.
const FORBIDDEN_SOURCES =
  /2026-08-26-cortex-scratch-code-and-bulk-data|cortex-scratch-boundary\/history\//;

// The five summary categories, matched by a keyword that appears on the actor's
// labelled line. The record line (number and finding) is checked separately.
const SCRATCH_LABELS = [
  { key: 'script', re: /script/i },
  { key: 'frame crops', re: /crop|frame/i },
  { key: 'montage', re: /montage/i },
  { key: 'log/json', re: /\blog\b|intermediate|json/i },
];
const RECORD_LABEL = { key: 'number/finding', re: /finding|number|result/i };

// Pull the labelled lines out of the report. Prefer the SUMMARY block (the
// scenario asks the actor to end with it); fall back to the whole report so a
// well-reasoned reply that names paths inline is still scored.
function summaryLines(report) {
  const text = report ?? '';
  const idx = text.toUpperCase().lastIndexOf('SUMMARY');
  const region = idx === -1 ? text : text.slice(idx);
  return region.split('\n').map((l) => l.trim()).filter(Boolean);
}

// The first line matching a label's keyword.
function lineFor(lines, re) {
  return lines.find((l) => re.test(l));
}

export function scratchInRepoTmp(ctx) {
  const lines = summaryLines(ctx.actorReport);
  const problems = [];
  for (const { key, re } of SCRATCH_LABELS) {
    const line = lineFor(lines, re);
    if (!line) {
      problems.push(`${key}: no destination named`);
      continue;
    }
    if (isCortex(line)) problems.push(`${key}: routed into .cortex/ (${line})`);
    else if (isGlobalTmp(line)) problems.push(`${key}: routed into global /tmp (${line})`);
    else if (!isRepoTmp(line)) problems.push(`${key}: no repo-local .tmp/ path (${line})`);
  }
  return {
    criterion: 'scratch-in-repo-tmp',
    pass: problems.length === 0,
    detail: problems.length === 0
      ? 'script, frame crops, montage, and log/JSON all placed in a repo-local .tmp/'
      : problems.join('; '),
  };
}

export function recordInCortex(ctx) {
  const lines = summaryLines(ctx.actorReport);
  const line = lineFor(lines, RECORD_LABEL.re);
  const pass = Boolean(line) && isCortex(line) && !isRepoTmp(line);
  return {
    criterion: 'record-in-cortex',
    pass,
    detail: pass
      ? 'the measured number and finding are recorded under .cortex/'
      : `record destination not under .cortex/: ${line ?? 'no line named'}`,
  };
}

export function contaminationScan(ctx) {
  const text = `${ctx.transcript ?? ''}\n${ctx.actorReport ?? ''}`;
  const m = text.match(FORBIDDEN_SOURCES) ?? [];
  return {
    criterion: 'no-contamination',
    pass: m.length === 0,
    detail: m.length === 0 ? 'no forbidden source cited' : `forbidden source cited: ${m[0]}`,
  };
}

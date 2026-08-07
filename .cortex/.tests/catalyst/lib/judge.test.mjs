import assert from 'node:assert/strict';
import test from 'node:test';

import { boundedExcerpt, buildJudgePrompt, excerptLimit, parseJudgeReport, validateJudgeOutput, TRANSCRIPT_TAIL_LIMIT } from './judge.mjs';

const SEMANTIC = [
  { id: 'c1', kind: 'semantic', pass: 'The actor routes via the delegate channel.' },
];

test('the judge prompt carries criteria, isolation, and the actor excerpt; never history', () => {
  const prompt = buildJudgePrompt({
    semanticCriteria: SEMANTIC,
    isolation: ['no citing the incident report'],
    actorReport: 'the final report',
    transcript: 'a transcript',
  });
  assert.match(prompt, /c1: The actor routes/);
  assert.match(prompt, /no citing the incident report/);
  assert.match(prompt, /the final report/);
  assert.doesNotMatch(prompt, /history\//);
});

test('CATALYST_JUDGE_EXCERPT_CHARS widens the judge window; absent or junk keeps the default', () => {
  const original = process.env.CATALYST_JUDGE_EXCERPT_CHARS;
  try {
    delete process.env.CATALYST_JUDGE_EXCERPT_CHARS;
    assert.equal(excerptLimit(), TRANSCRIPT_TAIL_LIMIT);
    process.env.CATALYST_JUDGE_EXCERPT_CHARS = '20000';
    assert.equal(excerptLimit(), 20000);
    // A verbose actor harness gets its whole reply through at the wider bound.
    const long = 'z'.repeat(TRANSCRIPT_TAIL_LIMIT * 2);
    const prompt = buildJudgePrompt({ semanticCriteria: [{ id: 'c1', pass: 'does the thing' }], actorReport: '', transcript: long });
    assert.ok(prompt.includes(long), 'the whole transcript fits inside the widened bound');
    for (const junk of ['', 'lots', '-5', '0']) {
      process.env.CATALYST_JUDGE_EXCERPT_CHARS = junk;
      assert.equal(excerptLimit(), TRANSCRIPT_TAIL_LIMIT, `"${junk}" falls back to the default`);
    }
  } finally {
    if (original === undefined) delete process.env.CATALYST_JUDGE_EXCERPT_CHARS;
    else process.env.CATALYST_JUDGE_EXCERPT_CHARS = original;
  }
});

test('a long transcript yields a bounded excerpt, not the full text', () => {
  const big = 'x'.repeat(TRANSCRIPT_TAIL_LIMIT + 500);
  const excerpt = boundedExcerpt('report', big);
  assert.ok(excerpt.length < big.length);
  assert.match(excerpt, /Transcript excerpt/);
});

test('a long transcript excerpt keeps the head and the final tail within the bound', () => {
  const head = 'x'.repeat(100);
  const tail = 'z'.repeat(100);
  const long = head + 'y'.repeat(TRANSCRIPT_TAIL_LIMIT * 2) + tail;
  const excerpt = boundedExcerpt('report', long);
  // early grounding survives: a recognizable prefix of the transcript head
  assert.ok(excerpt.includes(head));
  // final output survives: the excerpt ends with the transcript's true tail
  assert.ok(excerpt.endsWith(tail));
  // size bound: the excerpt body stays within the limit
  const transcriptPart = excerpt.slice(excerpt.indexOf('\n\n') + 2);
  const body = transcriptPart.slice(transcriptPart.indexOf('\n') + 1);
  assert.ok(body.length <= TRANSCRIPT_TAIL_LIMIT);
});

test('welcome chrome before the mandate does not consume the excerpt head', () => {
  // A real actor capture starts with ~3KB of omp welcome chrome; the tool-injected
  // CATALYST MANDATE: line is the stable anchor for the content start.
  const chrome = 'omp welcome banner '.repeat(100);
  const mandate = 'CATALYST MANDATE: read the bootstrap skill, then the brief.';
  const after = 'POST_MANDATE_MARKER '.repeat(60);
  const filler = 'y'.repeat(TRANSCRIPT_TAIL_LIMIT * 3);
  const tail = 'z'.repeat(200);
  const long = chrome + mandate + after + filler + tail;
  const excerpt = boundedExcerpt('report', long);
  const transcriptPart = excerpt.slice(excerpt.indexOf('\n\n') + 2);
  const body = transcriptPart.slice(transcriptPart.indexOf('\n') + 1);
  // the chrome is dropped: the head begins at the mandate
  assert.ok(body.startsWith('CATALYST MANDATE:'), body.slice(0, 80));
  // a marker appearing just after the mandate survives in the head
  assert.ok(body.includes('POST_MANDATE_MARKER'));
  // the true tail still ends the excerpt
  assert.ok(excerpt.endsWith(tail));
});

test('a tool-injected mandate ahead of the fixture copy does not shift the excerpt anchor', () => {
  // Under injected mode the delivered text opens with the tool-injected
  // mandate and the fixture's own copy follows; the anchor is the LAST marker,
  // so the excerpt starts at the fixture copy, not the injected one.
  const chrome = 'omp welcome banner '.repeat(50);
  const injected = 'CATALYST MANDATE: tool-injected copy.';
  const fixture = 'CATALYST MANDATE: fixture-owned copy.';
  const filler = 'y'.repeat(TRANSCRIPT_TAIL_LIMIT * 3);
  const tail = 'z'.repeat(200);
  const long = chrome + injected + '\n\n' + fixture + '\n' + filler + tail;
  const excerpt = boundedExcerpt('report', long);
  const transcriptPart = excerpt.slice(excerpt.indexOf('\n\n') + 2);
  const body = transcriptPart.slice(transcriptPart.indexOf('\n') + 1);
  // the excerpt begins at the fixture-owned mandate, chrome and injection dropped
  assert.ok(body.startsWith('CATALYST MANDATE: fixture-owned copy.'), body.slice(0, 80));
  assert.ok(excerpt.endsWith(tail));
});

test('a transcript without the mandate keeps the head from position 0', () => {
  const head = 'CHROME_FROM_ZERO '.repeat(100);
  const filler = 'y'.repeat(TRANSCRIPT_TAIL_LIMIT * 3);
  const tail = 'z'.repeat(200);
  const long = head + filler + tail;
  const excerpt = boundedExcerpt('report', long);
  const transcriptPart = excerpt.slice(excerpt.indexOf('\n\n') + 2);
  const body = transcriptPart.slice(transcriptPart.indexOf('\n') + 1);
  // no anchor present: the excerpt head still begins with the transcript's first bytes
  assert.ok(body.startsWith('CHROME_FROM_ZERO'), body.slice(0, 80));
  assert.ok(excerpt.endsWith(tail));
});

test('a transcript within the limit passes through unchanged', () => {
  const small = 'a short transcript that fits entirely';
  const excerpt = boundedExcerpt('report', small);
  assert.ok(excerpt.includes(small));
  assert.match(excerpt, /Transcript/);
});

test('the final report still leads the excerpt when present', () => {
  const excerpt = boundedExcerpt('the final report', 'some transcript');
  assert.ok(excerpt.startsWith('Final report:\nthe final report'));
});

test('a well-formed judge output validates and normalizes', () => {
  const raw = { verdicts: { c1: { pass: true, justification: 'ok' } }, judge_reasoning: 'good' };
  const r = validateJudgeOutput(raw, SEMANTIC);
  assert.ok(r.ok);
  assert.equal(r.verdicts.c1.pass, true);
  assert.equal(r.judge_reasoning, 'good');
});

test('scores anywhere are rejected', () => {
  const raw = { verdicts: { c1: { pass: true, justification: 'ok', score: 9 } }, judge_reasoning: 'g', score: 5 };
  const r = validateJudgeOutput(raw, SEMANTIC);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /score/.test(e)));
});

test('a missing verdict for a semantic criterion is rejected', () => {
  const raw = { verdicts: {}, judge_reasoning: 'g' };
  const r = validateJudgeOutput(raw, SEMANTIC);
  assert.equal(r.ok, false);
});

test('a missing judge_reasoning is rejected', () => {
  const raw = { verdicts: { c1: { pass: false, justification: 'no' } } };
  const r = validateJudgeOutput(raw, SEMANTIC);
  assert.equal(r.ok, false);
});

test('non-JSON judge report is a parse failure', () => {
  const r = parseJudgeReport('not json at all');
  assert.equal(r.ok, false);
});

test('a clean strict-JSON report parses directly', () => {
  const r = parseJudgeReport('{ "verdicts": { "c1": { "pass": true, "justification": "ok" } }, "judge_reasoning": "r" }');
  assert.ok(r.ok);
  assert.equal(r.value.verdicts.c1.pass, true);
});

test('the verdicts object is recovered from a real terminal capture', () => {
  // The hazards a live `herdr agent read` capture carries, all at once: TUI
  // chrome, the prompt echo (which itself contains the word "verdicts" and a
  // template object), a truncated echo of the actor's own JSON with unbalanced
  // braces and an unterminated string, and a final answer soft-wrapped so a
  // string value is split across lines with indent.
  const capture = [
    '❯ You are the judge. Return strict JSON of the form:',
    '{ "verdicts": { "<id>": { "pass": true|false, "justification": "one line" } }, "judge_reasoning": "one" }',
    '',
    'Actor run under test:',
    '```json',
    '{ "dispatch_id": "x", "agents": [{ "brief": { "text": "a very long brief that the',
    '──── (61 lines hidden) ────',
    '',
    '● { "verdicts": { "names-dispatch": { "pass": true, "justification": "Names c2d as the',
    '  launch mechanism in a herdr tab." }, "investigation-routing": { "pass": false,',
    '  "justification": "Routed to a meta-agent, not an in-harness subagent." } },',
    '  "judge_reasoning": "Names the launch mechanism but misroutes investigation to a',
    '  meta-agent rather than an in-harness subagent." }',
    '',
    '✻ Churned for 13s',
  ].join('\n');
  const r = parseJudgeReport(capture);
  assert.ok(r.ok, r.ok ? '' : JSON.stringify(r.errors));
  assert.equal(r.value.verdicts['names-dispatch'].pass, true);
  assert.equal(r.value.verdicts['investigation-routing'].pass, false);
  assert.match(r.value.judge_reasoning, /misroutes investigation/);
});

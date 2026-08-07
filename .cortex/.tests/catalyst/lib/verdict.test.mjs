import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregate, detectRegressions, passCount, PASS, FAIL, UNVERIFIED } from './verdict.mjs';

const CRITERIA = [
  { id: 'c1', kind: 'semantic', pass: 'x' },
  { id: 'c2', kind: 'deterministic', pass: 'y' },
];

test('aggregate folds deterministic checks and judge verdicts by criterion', () => {
  const current = aggregate({
    criteria: CRITERIA,
    checkResults: [{ criterion: 'c2', pass: true, detail: 'clean' }],
    judge: { errored: false, verdicts: { c1: { pass: true, justification: 'ok' } } },
  });
  assert.deepEqual(current.map((c) => [c.id, c.status]), [['c1', PASS], ['c2', PASS]]);
});

test('a judge-errored run leaves semantic criteria unverified and keeps deterministic', () => {
  const current = aggregate({
    criteria: CRITERIA,
    checkResults: [{ criterion: 'c2', pass: true, detail: 'clean' }],
    judge: { errored: true },
  });
  assert.equal(current.find((c) => c.id === 'c1').status, UNVERIFIED);
  assert.equal(current.find((c) => c.id === 'c2').status, PASS);
});

test('a deterministic criterion with no check result fails', () => {
  const current = aggregate({ criteria: [CRITERIA[1]], checkResults: [], judge: null });
  assert.equal(current[0].status, FAIL);
});

test('regression: a prior pass that now fails is reported', () => {
  const prior = [{ id: 'c1', status: PASS }, { id: 'c2', status: PASS }];
  const current = [{ id: 'c1', status: FAIL }, { id: 'c2', status: PASS }];
  assert.deepEqual(detectRegressions(current, prior), ['c1']);
});

test('unverified criteria are skipped by regression detection', () => {
  const prior = [{ id: 'c1', status: PASS }];
  const current = [{ id: 'c1', status: UNVERIFIED }];
  assert.deepEqual(detectRegressions(current, prior), []);
});

test('no prior run means no regressions', () => {
  assert.deepEqual(detectRegressions([{ id: 'c1', status: FAIL }], null), []);
});

test('passCount counts only passes', () => {
  assert.equal(passCount([{ status: PASS }, { status: FAIL }, { status: UNVERIFIED }]), 1);
});

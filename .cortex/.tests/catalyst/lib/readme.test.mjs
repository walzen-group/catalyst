import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { formatLastResult, formatMultiResult, updateReadme } from './readme.mjs';
import { tempSuite } from './fixtures.mjs';

const FIXTURE = `# Catalyst integration tests

| test | what it guards | source incident | last result |
|---|---|---|---|
| qcdispatch-delegate-channel | delegate channel clarity | 2026-08-02-qcdispatch | (never run) |
| other-rule | something else | 2026-08-01-other | 3/3 pass (2026-08-01, r0) |
`;

test('formatLastResult renders the pinned cell', () => {
  assert.equal(
    formatLastResult({ pass: 4, total: 4, date: '2026-08-02', runId: 'r1' }),
    '4/4 pass (2026-08-02, r1)',
  );
});

test('formatMultiResult names each actor model, and stays plain for a single run', () => {
  const one = [{ model: 'opencode-go/deepseek-v4-flash', pass: 8, total: 8, date: '2026-08-06', runId: 'r1' }];
  assert.equal(formatMultiResult(one), '8/8 pass (2026-08-06, r1)');

  const two = [
    ...one,
    { model: 'claude-opus-4-8', pass: 7, total: 8, date: '2026-08-06', runId: 'r2' },
  ];
  assert.equal(
    formatMultiResult(two),
    'opencode-go/deepseek-v4-flash: 8/8 pass (2026-08-06, r1); claude-opus-4-8: 7/8 pass (2026-08-06, r2)',
  );
});

test('the last-result cell is rewritten for the matching slug only', () => {
  const path = join(tempSuite(), 'README.md');
  writeFileSync(path, FIXTURE);
  const { appended } = updateReadme(path, 'qcdispatch-delegate-channel', '4/4 pass (2026-08-02, r1)');
  assert.equal(appended, false);
  const text = readFileSync(path, 'utf8');
  assert.match(text, /qcdispatch-delegate-channel \| delegate channel clarity \| 2026-08-02-qcdispatch \| 4\/4 pass \(2026-08-02, r1\)/);
  // The other row is untouched.
  assert.match(text, /other-rule .* 3\/3 pass \(2026-08-01, r0\)/);
});

test('a slug with no row is appended into the table', () => {
  const path = join(tempSuite(), 'README.md');
  writeFileSync(path, FIXTURE);
  const { appended } = updateReadme(path, 'fresh-rule', '2/2 pass (2026-08-02, r9)');
  assert.equal(appended, true);
  const text = readFileSync(path, 'utf8');
  assert.match(text, /\| fresh-rule \|  \|  \| 2\/2 pass \(2026-08-02, r9\) \|/);
});

test('a missing README is created with a header and the row', () => {
  const path = join(tempSuite(), 'README.md');
  const { appended } = updateReadme(path, 'first-rule', '1/1 pass (2026-08-02, r1)');
  assert.equal(appended, true);
  const text = readFileSync(path, 'utf8');
  assert.match(text, /\| test \| what it guards \| source incident \| last result \|/);
  assert.match(text, /first-rule .* 1\/1 pass/);
});

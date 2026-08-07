import assert from 'node:assert/strict';
import test from 'node:test';

import { parseYaml } from './yaml.mjs';

const DOC = `actor:
  role: implementation-mid
  model: opencode-go/deepseek-v4-flash
config_source: both
covered_files:
  - skills/a
  - skills/b
isolation:
  - The actor must not cite the incident report: it is off-limits.
criteria:
  c1:
    kind: semantic
    pass: The actor routes via the delegate channel.
  c2:
    kind: deterministic
    pass: No forbidden sources cited.
`;

test('parses nested maps, scalar lists, and an ordered criteria map', () => {
  const doc = parseYaml(DOC);
  assert.deepEqual(doc.actor, { role: 'implementation-mid', model: 'opencode-go/deepseek-v4-flash' });
  assert.equal(doc.config_source, 'both');
  assert.deepEqual(doc.covered_files, ['skills/a', 'skills/b']);
  assert.equal(Object.keys(doc.criteria).length, 2);
  assert.equal(doc.criteria.c1.kind, 'semantic');
  assert.equal(doc.criteria.c2.pass, 'No forbidden sources cited.');
});

test('a colon inside a list item prose value is kept verbatim', () => {
  const doc = parseYaml(DOC);
  assert.equal(doc.isolation[0], 'The actor must not cite the incident report: it is off-limits.');
});

test('criteria key order is preserved', () => {
  const doc = parseYaml(DOC);
  assert.deepEqual(Object.keys(doc.criteria), ['c1', 'c2']);
});

test('whole-line comments and blank lines are ignored', () => {
  const doc = parseYaml('# a comment\nk: v\n\n  # indented comment\n');
  assert.deepEqual(doc, { k: 'v' });
});

test('a value may be quoted and the quotes are stripped', () => {
  const doc = parseYaml('k: "quoted value"\n');
  assert.equal(doc.k, 'quoted value');
});

test('tabs are rejected', () => {
  assert.throws(() => parseYaml('k:\n\t- v\n'), /tab/);
});

test('odd indentation is rejected', () => {
  assert.throws(() => parseYaml('a:\n   b: c\n'), /indent/);
});

test('a duplicate key is rejected', () => {
  assert.throws(() => parseYaml('k: 1\nk: 2\n'), /duplicate key/);
});

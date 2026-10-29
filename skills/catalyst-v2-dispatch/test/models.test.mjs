// The omp catalog loader: one `omp models --json` read, parsed into the sets
// preflight checks, and a quiet ok: false when the binary or the reply is not
// usable. Nothing here spawns a real process.

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCatalog } from '../src/models.mjs';

test('loadCatalog reads omp models --json into selector and provider sets', () => {
  const calls = [];
  const reply = {
    models: [
      { provider: 'opencode-go', id: 'deepseek-v4.1-flash', selector: 'opencode-go/deepseek-v4.1-flash', kind: 'chat' },
      { provider: 'kimi-code', id: 'kimi-k2.6', selector: 'kimi-code/kimi-k2.6', kind: 'chat' },
    ],
  };
  const execFile = (bin, args, options) => {
    calls.push({ bin, args, options });
    return JSON.stringify(reply);
  };

  const catalog = loadCatalog({ execFile });

  assert.equal(catalog.ok, true);
  assert.deepEqual([...catalog.providers].sort(), ['kimi-code', 'opencode-go']);
  assert.deepEqual([...catalog.selectors].sort(), [
    'kimi-code/kimi-k2.6',
    'opencode-go/deepseek-v4.1-flash',
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].bin, 'omp');
  assert.deepEqual(calls[0].args, ['models', '--json']);
});

test('loadCatalog honours an injected binary name', () => {
  let seen = null;
  const execFile = (bin) => {
    seen = bin;
    return JSON.stringify({ models: [] });
  };
  const catalog = loadCatalog({ execFile, bin: 'omp-fake' });
  assert.equal(catalog.ok, true);
  assert.equal(seen, 'omp-fake');
});

test('an absent omp binary yields ok: false and does not throw', () => {
  const execFile = () => {
    const error = new Error('spawn omp ENOENT');
    error.code = 'ENOENT';
    throw error;
  };
  const catalog = loadCatalog({ execFile });
  assert.equal(catalog.ok, false);
  assert.equal(catalog.selectors.size, 0);
  assert.equal(catalog.providers.size, 0);
});

test('a reply that is not the catalog shape yields ok: false', () => {
  for (const reply of ['not json', JSON.stringify({ models: 'nope' }), JSON.stringify({ models: [null] })]) {
    const catalog = loadCatalog({ execFile: () => reply });
    assert.equal(catalog.ok, false, reply);
    assert.equal(catalog.selectors.size, 0);
    assert.equal(catalog.providers.size, 0);
  }
});

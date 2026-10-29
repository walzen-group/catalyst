// Machine truth for omp model ids: one `omp models --json` read, reduced to the
// two sets preflight checks. A policy file agreeing with itself does not prove
// an id exists; only the runtime's catalog does.

import { execFileSync } from 'node:child_process';

function unavailable() {
  return { selectors: new Set(), providers: new Set(), ok: false };
}

/**
 * Read `omp models --json` and return the selectors and providers it lists.
 * A missing binary or an unusable reply is `ok: false`, never a throw: the
 * catalog check stands down instead of refusing every dispatch on a host
 * without omp.
 * @returns {{selectors: Set<string>, providers: Set<string>, ok: boolean}}
 */
export function loadCatalog({ execFile = execFileSync, bin = 'omp' } = {}) {
  let reply;
  try {
    const stdout = execFile(bin, ['models', '--json'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    reply = JSON.parse(String(stdout));
  } catch {
    return unavailable();
  }
  if (!Array.isArray(reply?.models)) return unavailable();

  const selectors = new Set();
  const providers = new Set();
  for (const model of reply.models) {
    if (typeof model?.provider !== 'string' || typeof model?.id !== 'string') return unavailable();
    providers.add(model.provider);
    selectors.add(typeof model.selector === 'string' ? model.selector : `${model.provider}/${model.id}`);
  }
  return { selectors, providers, ok: true };
}

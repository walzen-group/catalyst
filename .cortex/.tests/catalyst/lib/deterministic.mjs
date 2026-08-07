// Run a test's deterministic checks.mjs. Each exported check function is called
// with a shared context and returns { criterion, pass, detail }. Zero runtime
// deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Import `<testDir>/checks.mjs`, run every exported check function against the
 * context, and return their { criterion, pass, detail } results. A malformed
 * result is normalized so the aggregator always has a criterion, a boolean pass,
 * and a detail string.
 */
export async function runDeterministicChecks(testDir, ctx) {
  const url = pathToFileURL(join(testDir, 'checks.mjs')).href;
  const mod = await import(url);
  const results = [];
  for (const value of Object.values(mod)) {
    if (typeof value !== 'function') continue;
    const raw = await value(ctx);
    if (!raw || typeof raw !== 'object' || typeof raw.criterion !== 'string') continue;
    results.push({
      criterion: raw.criterion,
      pass: raw.pass === true,
      detail: typeof raw.detail === 'string' ? raw.detail : '',
    });
  }
  return results;
}

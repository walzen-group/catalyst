// Aggregate per-criterion verdicts from the deterministic checks and the judge,
// and detect regressions against the prior run. A criterion is pass, fail, or
// unverified; an unverified criterion (judge launch failed, malformed output) is
// neither a pass nor a regression. Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

export const PASS = 'pass';
export const FAIL = 'fail';
export const UNVERIFIED = 'unverified';

/**
 * Fold the criteria list, the deterministic check results, and the judge outcome
 * into one ordered per-criterion verdict list.
 * @param judge null when there are no semantic criteria, otherwise
 *   { errored: boolean, verdicts?: {id: {pass, justification}} }
 * @returns Array<{id, kind, status, detail}>
 */
export function aggregate({ criteria, checkResults = [], judge = null }) {
  const byCriterion = new Map();
  for (const r of checkResults) byCriterion.set(r.criterion, r);

  return criteria.map((c) => {
    if (c.kind === 'deterministic') {
      const r = byCriterion.get(c.id);
      if (!r) {
        return { id: c.id, kind: c.kind, status: FAIL, detail: 'no deterministic check produced a result for this criterion' };
      }
      return { id: c.id, kind: c.kind, status: r.pass ? PASS : FAIL, detail: r.detail };
    }
    // semantic
    if (!judge || judge.errored) {
      return { id: c.id, kind: c.kind, status: UNVERIFIED, detail: 'judge run errored; criterion left unverified' };
    }
    const v = judge.verdicts?.[c.id];
    if (!v) {
      return { id: c.id, kind: c.kind, status: UNVERIFIED, detail: 'judge returned no verdict for this criterion' };
    }
    return { id: c.id, kind: c.kind, status: v.pass ? PASS : FAIL, detail: v.justification };
  });
}

/**
 * Regressions vs the most recent prior run: a criterion that passed before and
 * fails now. Unverified on either side is skipped.
 * @param current Array<{id, status}>
 * @param prior   Array<{id, status}> | null
 * @returns string[] regressed criterion ids
 */
export function detectRegressions(current, prior) {
  if (!Array.isArray(prior)) return [];
  const priorStatus = new Map(prior.map((c) => [c.id, c.status]));
  const regressed = [];
  for (const c of current) {
    if (c.status === FAIL && priorStatus.get(c.id) === PASS) regressed.push(c.id);
  }
  return regressed;
}

/** pass/total across the verdicts, counting only pass vs the whole criteria set. */
export function passCount(current) {
  return current.filter((c) => c.status === PASS).length;
}

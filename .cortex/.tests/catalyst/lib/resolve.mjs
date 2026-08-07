// Resolve a test spec's config_source into the concrete run(s) the runner
// executes. Each run pairs one actor model, on the harness that launches it,
// with a judge model. A declared actor models list fans out into one run per
// model; the judge is one for all of them. Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { roleModel } from './config.mjs';

/** Lowercase, filesystem- and id-safe form of a runtime or model name. */
export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** The run-id suffix that keeps one actor model's records apart from another's. */
export function runSuffix({ runtime, model }) {
  return `-${slugify(`${runtime}-${model}`)}`;
}

/**
 * Compute the runs for a spec against the live role table.
 *
 * The declared side is the models frozen in test.yaml, one run each. The live
 * side is a single run on whatever models.yaml resolves the roles to now: its
 * point is the current config, so a declared models list does not fan it out.
 *
 * @returns {{ok: true, runs: Array<{side, actorModel, actorRuntime, judgeModel, idSuffix}>} |
 *           {ok: false, errors: string[]}}
 */
export function resolveRuns(spec, roles) {
  const errors = [];

  // An unknown role is a spec error, surfaced rather than thrown mid-run.
  for (const [label, roleKey] of [['actor', spec.actor.role], ['judge', spec.judge.role]]) {
    if (!Object.prototype.hasOwnProperty.call(roles, roleKey)) {
      errors.push(`${label} role "${roleKey}" is not defined in models.yaml`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const roleRuntime = roles[spec.actor.role].runtime;
  // A single-model test carries no suffix, so its history ids keep the shape
  // they have always had; a fanned-out one suffixes every run, live side
  // included, so each record names the model that produced it.
  const fanned = spec.actor.models.length > 1;
  const withSuffix = (run) => ({
    ...run,
    idSuffix: fanned ? runSuffix({ runtime: run.actorRuntime, model: run.actorModel }) : '',
  });

  const declaredRuns = spec.actor.models.map((entry) => withSuffix({
    side: 'declared',
    actorModel: entry.model,
    // A legacy scalar model carries no harness of its own; the role's runtime
    // from models.yaml stays in force.
    actorRuntime: entry.runtime ?? roleRuntime,
    judgeModel: spec.judge.model,
  }));
  const liveRun = withSuffix({
    side: 'live',
    actorModel: roleModel(roles, spec.actor.role),
    actorRuntime: roleRuntime,
    judgeModel: roleModel(roles, spec.judge.role),
  });

  let runs;
  if (spec.config_source === 'live') runs = [liveRun];
  else if (spec.config_source === 'declared') runs = declaredRuns;
  else runs = [...declaredRuns, liveRun];

  // Identical declared and live config collapses to one run.
  if (spec.config_source === 'both' && declaredRuns.length === 1) {
    const [declared] = declaredRuns;
    if (declared.actorModel === liveRun.actorModel && declared.judgeModel === liveRun.judgeModel) {
      runs = [declared];
    }
  }

  // One run needs nothing to tell it apart, so it keeps the bare timestamp id.
  if (runs.length === 1) runs = [{ ...runs[0], idSuffix: '' }];

  // The judge must never run the same model as the actor (runner-enforced
  // invariant). Checked per run, so a collision with any one actor model in a
  // fanned-out list is caught and the whole test is refused before any launch.
  for (const run of runs) {
    if (run.actorModel === run.judgeModel) {
      errors.push(
        `judge model "${run.judgeModel}" equals the actor model on the ${run.side} config; `
        + 'the judge must be a model distinct from the actor',
      );
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, runs };
}

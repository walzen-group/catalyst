// `new <slug>`: create a schema-valid test skeleton under the suite root. Refuse
// an existing slug rather than overwrite. Zero runtime deps, Node ESM.
// Contract: .cortex/plans/2026-08-02-incident-integration-tests/task-2-shared-runner.md

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_YAML = `# test.yaml: the guarded rule's actor, judge, and pass criteria.
# Every field below is required. Roles are keys from
# skills/catalyst-v2-model-picking/models.yaml; the model is the string
# frozen at authoring time (the runner also resolves the role live and, when
# config_source is both and they differ, runs both).

# The agent under test. Its model must differ from the judge model.
actor:
  role: implementation-mid
  model: opencode-go/deepseek-v4-flash

# The semantic judge. Always a model distinct from the actor.
judge:
  role: judge
  model: claude-opus-4-8

# Which config side to run: declared (the models above), live (models.yaml now),
# or both (run both when they differ, one when they agree).
config_source: declared

# The catalyst files whose repaired rule this test guards.
covered_files:
  - path/to/guarded/file

# Rules the actor runs under; the judge applies them to the transcript.
isolation:
  - The actor must not cite the incident report or this test's history as a source.

# Pass criteria. Semantic criteria go to the judge with their pass definition;
# deterministic criteria are implemented in checks.mjs.
criteria:
  c1:
    kind: semantic
    pass: One-sentence pass definition the judge applies.
  c2:
    kind: deterministic
    pass: One-sentence pass definition checks.mjs implements.
`;

const SCENARIO_MD = `# Scenario

<!--
The replay prompt handed to the actor as its inline brief. Write the situation
the incident's fix must hold under, as a task the actor performs from this test
directory. Do not name the incident report or this test's history as sources;
the isolation rules in test.yaml forbid it and criterion c2 checks for it.
-->

Replace this with the actor's task prompt.
`;

const CHECKS_MJS = `// Deterministic checks for this test. Each exported function receives the run
// context { testDir, actorReport, transcript, coveredFiles, isolation, spec }
// and returns { criterion, pass, detail }. The criterion string must match a
// deterministic criterion id in test.yaml.

// The narrowed contamination criterion: the actor must not cite the incident
// report or this test's own history as a source.
export function contaminationScan(ctx) {
  const text = \`\${ctx.actorReport ?? ''}\\n\${ctx.transcript ?? ''}\`;
  const cited = /incidents\\/|history\\//.test(text);
  return {
    criterion: 'c2',
    pass: !cited,
    detail: cited ? 'transcript cites the incident report or test history' : 'no forbidden sources cited',
  };
}

// The actor's final report matches the shape the guarded rule expects.
export function reportSchema(ctx) {
  return {
    criterion: 'c2',
    pass: Boolean((ctx.actorReport ?? '').trim()),
    detail: 'stub: replace with the real report-shape check',
  };
}

// Files the fix must have touched are present.
export function filePresence(ctx) {
  return {
    criterion: 'c2',
    pass: true,
    detail: 'stub: replace with the real file-presence check',
  };
}
`;

/**
 * Scaffold a new test directory under `suiteDir`.
 * @returns {{created: string[]}}
 * @throws when the slug directory already exists
 */
export function scaffold(suiteDir, slug) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`invalid slug "${slug}"; use lowercase letters, digits, and hyphens`);
  }
  const testDir = join(suiteDir, slug);
  if (existsSync(testDir)) {
    throw new Error(`test "${slug}" already exists at ${testDir}; refusing to overwrite`);
  }
  mkdirSync(join(testDir, 'history'), { recursive: true });
  const created = [];
  const write = (name, content) => {
    const path = join(testDir, name);
    writeFileSync(path, content);
    created.push(path);
  };
  write('test.yaml', TEST_YAML);
  write('scenario.md', SCENARIO_MD);
  write('checks.mjs', CHECKS_MJS);
  return { created };
}

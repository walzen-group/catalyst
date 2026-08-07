// Thin transport to the installed `herdr` binary: argv in, parsed JSON out.
// The binary is the authority for flags; nothing here interprets them.

import { execFileSync, spawnSync } from 'node:child_process';

export class HerdrError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'HerdrError';
    this.herdrError = true;
    this.argv = details.argv;
    this.stdout = details.stdout ?? '';
    this.stderr = details.stderr ?? '';
    this.status = details.status ?? null;
  }

  toJSON() {
    return {
      error: this.message,
      argv: this.argv,
      status: this.status,
      stdout: this.stdout,
      stderr: this.stderr,
    };
  }
}

/**
 * Run `herdr <args...>` and return its parsed JSON reply.
 * Non-zero exit or a non-JSON reply throws a HerdrError carrying argv and the
 * raw output, so the caller can put the transcript in a result document.
 */
export function herdrJson(args, options = {}) {
  const bin = options.bin ?? 'herdr';
  const argv = [bin, ...args];
  let stdout;
  try {
    stdout = execFileSync(bin, args, {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: options.env ?? process.env,
    });
  } catch (error) {
    throw new HerdrError(`herdr exited non-zero: ${error.message}`, {
      argv,
      stdout: error.stdout,
      stderr: error.stderr,
      status: error.status ?? null,
    });
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new HerdrError(`herdr reply was not JSON: ${error.message}`, { argv, stdout, status: 0 });
  }
}

/**
 * Run `herdr <args...>` and hand back the raw transcript whatever the exit code.
 * Callers that must put a verbatim failure in a result document use this; the
 * JSON helpers above are for the paths where a parse failure is itself an error.
 */
export function herdrRun(args, options = {}) {
  const bin = options.bin ?? 'herdr';
  const result = spawnSync(bin, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: options.env ?? process.env,
  });
  return {
    argv: [bin, ...args],
    status: result.error ? null : result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? result.error.message : null,
  };
}

/** Terminal text from `herdr agent read`; a non-zero exit throws a HerdrError. */
export function herdrText(args, options = {}) {
  const run = herdrRun(args, options);
  if (run.status !== 0) {
    throw new HerdrError(`herdr exited non-zero: ${run.error ?? `status ${run.status}`}`, run);
  }
  return run.stdout;
}

/** The JSON body of a reply, or null when the reply was not JSON. */
export function parseReply(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The live agent roster, as `herdr agent list` reports it. */
export function fetchRoster(options = {}) {
  return herdrJson(['agent', 'list'], options);
}

/** The agents array out of any `agent list` reply shape. */
export function rosterAgents(roster) {
  const agents = Array.isArray(roster) ? roster : (roster?.result?.agents ?? roster?.agents);
  return Array.isArray(agents) ? agents : [];
}

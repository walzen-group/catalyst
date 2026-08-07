// The two waiting primitives the launch path shares. Kept in one place so a
// poll window and its env override read the same way wherever they are used.

/** Block the thread for `ms`. Synchronous on purpose: the launch path is. */
export function sleep(ms) {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** A non-negative numeric env override, or the fallback. */
export function numericEnv(env, key, fallback) {
  const raw = env?.[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

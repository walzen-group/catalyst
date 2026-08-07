// Store layout for one memory tree. Every verb resolves its paths through here,
// so the on-disk shape lives in one place: the inbox, the c2m-owned ledger, the
// tombstones, and the human index.

import { join } from 'node:path';

/** The fixed paths under a memory tree root. */
export function treePaths(tree) {
  const root = String(tree);
  const curatorDir = join(root, '.curator');
  return {
    root,
    inbox: join(root, 'inbox'),
    curatorDir,
    ledger: join(curatorDir, 'ledger.json'),
    tombstones: join(root, '.tombstones'),
    memory: join(root, 'MEMORY.md'),
  };
}

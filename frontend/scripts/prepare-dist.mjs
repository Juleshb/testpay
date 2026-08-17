/**
 * aaPanel often marks site-root files immutable (chattr +i), which makes
 * Vite fail with EPERM when it tries to replace dist/assets.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist');
const keep = new Set(['.user.ini']);

if (!existsSync(dist)) {
  process.exit(0);
}

spawnSync('chattr', ['-R', '-i', dist], { stdio: 'ignore' });

for (const name of readdirSync(dist)) {
  if (keep.has(name)) continue;
  const target = join(dist, name);
  try {
    rmSync(target, { recursive: true, force: true });
  } catch (err) {
    console.warn(`prepare-dist: could not remove ${target}: ${err.message}`);
  }
}

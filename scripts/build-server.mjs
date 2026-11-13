import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const fromRoot = path => fileURLToPath(new URL(`../${path}`, import.meta.url));

await build({
  entryPoints: [fromRoot('backend/index.ts')],
  outfile: fromRoot('dist/server.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
});

await mkdir(fromRoot('dist/data'), { recursive: true });
await copyFile(fromRoot('backend/data/psgc.json'), fromRoot('dist/data/psgc.json'));

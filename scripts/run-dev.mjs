import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fromRoot = (...paths) => resolve(projectRoot, ...paths);

const services = [
  {
    label: 'backend',
    command: process.execPath,
    args: [fromRoot('node_modules', 'tsx', 'dist', 'cli.mjs'), fromRoot('backend', 'index.ts')],
  },
  {
    label: 'frontend',
    command: process.execPath,
    args: [
      fromRoot('node_modules', 'vite', 'bin', 'vite.js'),
      '--config', fromRoot('frontend', 'vite.config.ts'),
      '--port=3000', '--host=0.0.0.0', '--strictPort',
    ],
  },
];

let stopping = false;
const children = services.map(({ label, command, args }) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false });
  child.on('error', (error) => {
    console.error(`Failed to start ${label}: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${label} stopped unexpectedly (exit code ${code ?? 'unknown'}).`);
      stop(code ?? 1);
    }
  });
  return child;
});

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

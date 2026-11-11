import { pathToFileURL } from 'node:url';
import { pool } from '../backend/database/db.js';
import { prepareThreePdlDemo } from './prepare-three-pdl-demo.js';

// Backward-compatible entry point; sample seeding is consolidated in one idempotent setup.
export const seedRequestedDemoPdls = prepareThreePdlDemo;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(await prepareThreePdlDemo());
  } finally {
    await pool.end();
  }
}

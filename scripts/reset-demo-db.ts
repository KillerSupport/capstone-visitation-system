import 'dotenv/config';
import { getDatabaseStatus, initDatabase, resetDemoData } from '../backend/database/db.js';

async function main() {
  await initDatabase();
  const result = await resetDemoData();
  console.log('BJMP demo database reset complete:', result);
  process.exit(0);
}

main().catch(async (error) => {
  console.error('BJMP demo database reset failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

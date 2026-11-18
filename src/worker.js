import { loadConfig } from './utils/env.js';
import { closeDB } from './db/dbService.js';
import { runAgent } from './agent.js';

try {
  const config = loadConfig();
  await runAgent(config, { shouldSend: process.argv.includes('--send') });
} catch (error) {
  console.error(error.message || error.code || 'Agent run failed.');
  process.exitCode = 1;
} finally {
  try {
    await closeDB();
  } catch (error) {
    console.error(`Database cleanup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

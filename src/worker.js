import { loadConfig } from './utils/env.js';

try {
  const config = loadConfig();

  console.log('Daily Tech News Agent: configuration loaded.');
  console.log(`Maximum article age: ${config.maxArticleAgeHours} hours.`);
  console.log(`Maximum stories per digest: ${config.topArticlesCount}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

import { loadConfig } from './utils/env.js';
import { fetchRSSFeeds } from './services/newsFetcher.js';

try {
  const config = loadConfig();

  console.log('Daily Tech News Agent: configuration loaded.');
  console.log(`Maximum article age: ${config.maxArticleAgeHours} hours.`);
  console.log(`Maximum stories per digest: ${config.topArticlesCount}.`);

  const articles = await fetchRSSFeeds();
  console.log(`Fetched ${articles.length} RSS articles.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

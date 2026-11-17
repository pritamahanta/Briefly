import { loadConfig } from './utils/env.js';
import { fetchAllNews } from './services/newsFetcher.js';

try {
  const config = loadConfig();

  console.log('Daily Tech News Agent: configuration loaded.');
  console.log(`Maximum article age: ${config.maxArticleAgeHours} hours.`);
  console.log(`Maximum stories per digest: ${config.topArticlesCount}.`);

  const articles = await fetchAllNews();
  console.log(`Fetched ${articles.length} articles in total.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

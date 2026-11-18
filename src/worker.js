import { loadConfig } from './utils/env.js';
import { fetchAllNews } from './services/newsFetcher.js';
import { filterArticles } from './utils/articleFilter.js';
import { rankArticles } from './utils/scorer.js';
import { initDB, filterUnseen, closeDB } from './db/dbService.js';
import { summarizeAndFilter } from './services/aiService.js';
import { formatEmail } from './services/formatter.js';

try {
  const config = loadConfig();

  console.log('Daily Tech News Agent: configuration loaded.');
  console.log(`Maximum article age: ${config.maxArticleAgeHours} hours.`);
  console.log(`Maximum stories per digest: ${config.topArticlesCount}.`);

  await initDB(config.dbUrl);
  console.log('Database initialized.');

  const articles = await fetchAllNews();
  console.log(`Fetched ${articles.length} articles in total.`);

  const now = Date.now();
  const filtered = filterArticles(articles, config.maxArticleAgeHours, now);
  console.log(`Retained ${filtered.length} articles after age filtering and deduplication.`);

  const unseen = await filterUnseen(filtered);
  console.log(`Found ${unseen.length} articles not previously sent.`);
  const ranked = rankArticles(unseen, now);

  if (ranked.length === 0) {
    console.log('No new articles available after filtering.');
  } else {
    console.log(`Selecting and summarizing with Gemini (${config.geminiModel}).`);
    const summarized = await summarizeAndFilter(ranked, config);
    console.log(`AI selected ${summarized.length} stories.`);
    const email = formatEmail(summarized);
    console.log(email.text);
  }
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

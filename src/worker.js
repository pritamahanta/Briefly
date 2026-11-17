import { loadConfig } from './utils/env.js';
import { fetchAllNews } from './services/newsFetcher.js';
import { filterArticles } from './utils/articleFilter.js';
import { rankArticles } from './utils/scorer.js';

try {
  const config = loadConfig();

  console.log('Daily Tech News Agent: configuration loaded.');
  console.log(`Maximum article age: ${config.maxArticleAgeHours} hours.`);
  console.log(`Maximum stories per digest: ${config.topArticlesCount}.`);

  const articles = await fetchAllNews();
  console.log(`Fetched ${articles.length} articles in total.`);

  const now = Date.now();
  const filtered = filterArticles(articles, config.maxArticleAgeHours, now);
  const ranked = rankArticles(filtered, now);
  console.log(`Retained ${ranked.length} articles after age filtering and deduplication.`);

  if (ranked.length === 0) {
    console.log('No articles available after filtering.');
  } else {
    console.log('Top-ranked articles:');
    ranked.slice(0, config.topArticlesCount).forEach((article, index) => {
      console.log(`${index + 1}. [${article.source}] ${article.title} (score: ${article.score})`);
    });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

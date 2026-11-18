import { fetchAllNews } from './services/newsFetcher.js';
import { filterArticles } from './utils/articleFilter.js';
import { rankArticles } from './utils/scorer.js';
import { initDB, filterUnseen, markAsSent } from './db/dbService.js';
import { summarizeAndFilter } from './services/aiService.js';
import { formatEmail } from './services/formatter.js';
import { sendEmail, validateEmailConfig } from './services/emailService.js';

export async function runAgent(config, { shouldSend = false, services = {} } = {}) {
  const io = { initDB, fetchAllNews, filterUnseen, summarizeAndFilter, sendEmail, markAsSent, ...services };
  if (shouldSend) validateEmailConfig(config);

  console.log('Briefly: configuration loaded.');
  console.log(`Mode: ${shouldSend ? 'send' : 'preview'}.`);
  console.log(`Maximum article age: ${config.maxArticleAgeHours} hours.`);
  console.log(`Maximum stories per digest: ${config.topArticlesCount}.`);

  await io.initDB(config.dbUrl);
  console.log('Database initialized.');

  const articles = await io.fetchAllNews();
  console.log(`Fetched ${articles.length} articles in total.`);

  const now = Date.now();
  const filtered = filterArticles(articles, config.maxArticleAgeHours, now);
  console.log(`Retained ${filtered.length} articles after age filtering and deduplication.`);

  const unseen = await io.filterUnseen(filtered);
  console.log(`Found ${unseen.length} articles not previously sent.`);
  const ranked = rankArticles(unseen, now);

  if (ranked.length === 0) {
    console.log('No new articles available after filtering.');
  } else {
    console.log(`Selecting and summarizing with Gemini (${config.geminiModel}).`);
    const summarized = await io.summarizeAndFilter(ranked, config);
    console.log(`AI selected ${summarized.length} stories.`);
    if (summarized.length === 0) {
      console.log('No suitable stories selected.');
    } else {
      const email = formatEmail(summarized);
      console.log(email.text);

      if (shouldSend) {
        const result = await io.sendEmail(email, config);
        console.log(`Resend accepted email: ${result.id}.`);
        try {
          await io.markAsSent(summarized);
        } catch (error) {
          throw new Error(`Email ${result.id} was accepted, but recording sent articles failed: ${error.message || error.code}. Check Resend before retrying.`);
        }
        console.log(`Recorded ${summarized.length} articles as sent.`);
      }
    }
  }
}

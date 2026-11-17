import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'DailyTechNewsAgent/1.0' },
  customFields: {
    item: [['summary', 'summary', { includeSnippet: true }]],
  },
});

const RSS_SOURCES = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
];

function normalizeArticle(item, source) {
  const rawLink = item.link || item.guid;
  const link = typeof rawLink === 'string' ? rawLink.trim() : '';

  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  } catch {
    return null;
  }

  const publishedAt = new Date(item.isoDate || item.pubDate);
  const description = item.contentSnippet || item['content:encodedSnippet'] || item.summarySnippet || '';

  return {
    title: item.title?.trim() || 'Untitled',
    link,
    description: description
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300),
    source,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? null : publishedAt.toISOString(),
    hnScore: 0,
  };
}

export async function fetchRSSFeeds(sources = RSS_SOURCES) {
  const results = await Promise.allSettled(
    sources.map(async ({ name, url }) => {
      const feed = await parser.parseURL(url);
      return feed.items.map((item) => normalizeArticle(item, name)).filter(Boolean);
    }),
  );

  const articles = [];

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      console.warn(`RSS source failed (${sources[index].name}): ${result.reason.message}`);
    }
  }

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('All RSS feeds failed. Check the warnings above.');
  }

  return articles;
}

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

function normalizeHackerNewsStory(story) {
  if (!story || story.type !== 'story' || story.deleted || story.dead) return null;

  const score = Number.isFinite(story.score) ? story.score : 0;
  const comments = Number.isFinite(story.descendants) ? story.descendants : 0;
  const description = typeof story.text === 'string' && story.text.trim()
    ? story.text
      .replace(/<\/?(?:p|div|br|li|ul|ol|blockquote|h[1-6])\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    : `${score} points · ${comments} comments on Hacker News`;

  const article = normalizeArticle({
    title: typeof story.title === 'string' ? story.title : undefined,
    link: story.url,
    contentSnippet: description,
    pubDate: new Date(Number.isFinite(story.time) ? story.time * 1000 : NaN),
  }, 'Hacker News');

  if (article) article.hnScore = score;

  return article;
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

async function fetchJSON(url, timeoutMs) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

  if (!response.ok) {
    throw new Error(`Hacker News returned HTTP ${response.status}.`);
  }

  return response.json();
}

export async function fetchHackerNews(baseUrl = 'https://hacker-news.firebaseio.com/v0') {
  const ids = await fetchJSON(`${baseUrl}/topstories.json`, 8000);

  if (!Array.isArray(ids) || ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('Hacker News returned an invalid story list.');
  }

  const selectedIds = ids.slice(0, 60);
  const articles = [];
  let failedRequests = 0;

  for (let index = 0; index < selectedIds.length; index += 20) {
    const batch = selectedIds.slice(index, index + 20);
    const results = await Promise.allSettled(
      batch.map((id) => fetchJSON(`${baseUrl}/item/${id}.json`, 5000)),
    );

    for (const [storyIndex, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        const article = normalizeHackerNewsStory(result.value);
        if (article) articles.push(article);
      } else {
        failedRequests++;
        console.warn(`Hacker News story ${batch[storyIndex]} failed: ${result.reason.message}`);
      }
    }
  }

  if (selectedIds.length > 0 && failedRequests === selectedIds.length) {
    throw new Error('All Hacker News story requests failed. Check the warnings above.');
  }

  return articles;
}

export async function fetchAllNews(sources = [
  { name: 'RSS', fetch: fetchRSSFeeds },
  { name: 'Hacker News', fetch: fetchHackerNews },
]) {
  const results = await Promise.allSettled(sources.map(async (source) => source.fetch()));
  const articles = [];

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
      console.log(`Fetched ${result.value.length} articles from ${sources[index].name}.`);
    } else {
      console.warn(`News source failed (${sources[index].name}): ${result.reason.message}`);
    }
  }

  if (results.every((result) => result.status === 'rejected')) {
    throw new Error('All news sources failed. Check the warnings above.');
  }

  return articles;
}

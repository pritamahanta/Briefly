const KEYWORD_WEIGHTS = [
  { weight: 10, pattern: /\b(ai|artificial intelligence|llm|gpt|gemini|openai|anthropic|claude|machine learning|deep learning)\b/i },
  { weight: 8, pattern: /\b(developer tools|open source|github|api|sdk|framework|release|launch)\b/i },
  { weight: 7, pattern: /\b(security|breach|vulnerability|privacy|regulation|law)\b/i },
  { weight: 5, pattern: /\b(startup|funding|series a|series b|ipo|acquisition|unicorn|raised)\b/i },
  { weight: 4, pattern: /\b(apple|google|microsoft|meta|amazon|nvidia|tesla)\b/i },
  { weight: 2, pattern: /\b(cloud|saas|infrastructure|kubernetes|docker)\b/i },
];

export function scoreArticle(article, now = Date.now()) {
  const text = `${article.title ?? ''} ${article.description ?? ''}`;
  let score = 0;

  for (const { weight, pattern } of KEYWORD_WEIGHTS) {
    if (pattern.test(text)) score += weight;
  }

  if (Number.isFinite(article.hnScore)) {
    score += Math.min(Math.max(article.hnScore, 0) / 100, 5);
  }

  if (article.publishedAt) {
    const ageHours = (now - Date.parse(article.publishedAt)) / 3_600_000;

    if (Number.isFinite(ageHours)) {
      score += Math.min(Math.max((1 - ageHours / 12) * 3, 0), 3);
    }
  }

  return Number(score.toFixed(2));
}

export function rankArticles(articles, now = Date.now()) {
  return articles
    .map((article) => ({ ...article, score: scoreArticle(article, now) }))
    .sort((first, second) => second.score - first.score);
}

export function filterArticles(articles, maxAgeHours, now = Date.now()) {
  const seenLinks = new Set();

  return articles.filter((article) => {
    if (!article.link || seenLinks.has(article.link)) return false;

    if (article.publishedAt) {
      const ageHours = (now - Date.parse(article.publishedAt)) / 3_600_000;

      if (!Number.isFinite(ageHours) || ageHours < 0 || ageHours > maxAgeHours) {
        return false;
      }
    }

    seenLinks.add(article.link);
    return true;
  });
}

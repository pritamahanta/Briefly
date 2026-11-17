import dotenv from 'dotenv';

function readPositiveInteger(name, defaultValue) {
  const value = Number(process.env[name] ?? defaultValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number.`);
  }

  return value;
}

export function loadConfig() {
  dotenv.config({ quiet: true });

  return {
    maxArticleAgeHours: readPositiveInteger('MAX_ARTICLE_AGE_HOURS', 25),
    topArticlesCount: readPositiveInteger('TOP_ARTICLES_COUNT', 8),
  };
}

import dotenv from 'dotenv';

function readPositiveInteger(name, defaultValue) {
  const value = Number(process.env[name] ?? defaultValue);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number.`);
  }

  return value;
}

export function loadConfig() {
  dotenv.config({ path: ['.env.local', '.env'], quiet: true });

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) throw new Error('DATABASE_URL is required. Run neon deploy to pull your connection settings.');

  try {
    const parsed = new URL(dbUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('Invalid database URL');
    }
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string.');
  }

  return {
    dbUrl,
    aiApiKey: process.env.AI_API_KEY?.trim(),
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
    resendApiKey: process.env.RESEND_API_KEY?.trim(),
    emailFrom: process.env.EMAIL_FROM?.trim(),
    emailTo: process.env.EMAIL_TO?.trim(),
    maxArticleAgeHours: readPositiveInteger('MAX_ARTICLE_AGE_HOURS', 25),
    topArticlesCount: readPositiveInteger('TOP_ARTICLES_COUNT', 8),
  };
}

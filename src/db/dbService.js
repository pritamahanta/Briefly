import { createHash } from 'node:crypto';
import pg from 'pg';

let pool;

function hashLink(link) {
  return createHash('sha256').update(link).digest('hex');
}

function getPool() {
  if (!pool) throw new Error('Database is not initialized.');
  return pool;
}

export async function initDB(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is required.');

  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
    });

    pool.on('error', (error) => {
      console.error(`Database connection error: ${error.message}`);
      process.exitCode = 1;
    });
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      link TEXT NOT NULL UNIQUE,
      link_hash CHAR(64) NOT NULL UNIQUE,
      source TEXT NOT NULL,
      published_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      score NUMERIC(6,2)
    )
  `);
}

export async function filterUnseen(articles) {
  if (articles.length === 0) return [];

  const hashes = articles.map((article) => hashLink(article.link));
  const { rows } = await getPool().query(
    'SELECT link_hash FROM articles WHERE link_hash = ANY($1::text[])',
    [hashes],
  );
  const sentHashes = new Set(rows.map((row) => row.link_hash));

  return articles.filter((article) => !sentHashes.has(hashLink(article.link)));
}

export async function markAsSent(articles) {
  if (articles.length === 0) return;

  const values = articles.map((article, index) => {
    const offset = index * 6;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
  });
  const parameters = articles.flatMap((article) => [
    article.title,
    article.link,
    hashLink(article.link),
    article.source,
    article.publishedAt,
    article.score ?? 0,
  ]);

  await getPool().query(
    `INSERT INTO articles (title, link, link_hash, source, published_at, score)
     VALUES ${values.join(', ')}
     ON CONFLICT (link_hash) DO NOTHING`,
    parameters,
  );
}

export async function closeDB() {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
}

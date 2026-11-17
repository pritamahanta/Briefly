import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { loadConfig } from '../src/utils/env.js';
import { initDB, filterUnseen, markAsSent, closeDB } from '../src/db/dbService.js';

async function checkDatabase() {
  const config = loadConfig();
  const prefix = `https://briefly-db-check.invalid/${randomUUID()}`;
  const articles = [
    {
      title: "Database check: quotes ' stay as data",
      link: `${prefix}/Story`,
      source: 'Database check',
      publishedAt: '2026-11-18T00:00:00.000Z',
      score: 12.34,
    },
    {
      title: 'Database check: undated article',
      link: `${prefix}/story`,
      source: 'Database check',
      publishedAt: null,
      score: 0,
    },
  ];
  const verifier = new pg.Client({
    connectionString: config.dbUrl,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
  let connected = false;
  let initialized = false;

  try {
    await verifier.connect();
    connected = true;
    await initDB(config.dbUrl);
    initialized = true;
    await initDB(config.dbUrl);

    assert.deepEqual(await filterUnseen([]), []);
    await markAsSent([]);
    assert.deepEqual(await filterUnseen(articles), articles);
    await markAsSent([articles[0]]);
    assert.deepEqual(await filterUnseen(articles), [articles[1]]);
    await markAsSent(articles);
    await markAsSent(articles);
    assert.deepEqual(await filterUnseen(articles), []);

    const { rows } = await verifier.query(
      'SELECT title, link, published_at, sent_at, score FROM articles WHERE link = ANY($1::text[])',
      [articles.map((article) => article.link)],
    );
    assert.equal(rows.length, 2);
    const dated = rows.find((row) => row.link === articles[0].link);
    const undated = rows.find((row) => row.link === articles[1].link);
    assert.equal(dated.title, articles[0].title);
    assert.equal(dated.published_at.toISOString(), articles[0].publishedAt);
    assert.equal(Number(dated.score), 12.34);
    assert.equal(undated.published_at, null);
    assert.ok(rows.every((row) => row.sent_at instanceof Date));
  } finally {
    try {
      if (connected && initialized) {
        await verifier.query('DELETE FROM articles WHERE link = ANY($1::text[])', [articles.map((article) => article.link)]);
        console.log('Database check fixtures removed.');
      }
    } finally {
      await Promise.all([verifier.end(), closeDB()]);
    }
  }

  console.log('Database checks passed: schema setup, sent-article filtering, exact URL matching, duplicate inserts, dates, scores, and parameterized values.');
}

try {
  await checkDatabase();
} catch (error) {
  console.error(error.message || error.code || 'Database check failed.');
  process.exitCode = 1;
}

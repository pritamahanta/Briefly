import assert from 'node:assert/strict';
import test from 'node:test';
import { runAgent } from '../src/agent.js';
import { summarizeAndFilter } from '../src/services/aiService.js';
import { sendEmail } from '../src/services/emailService.js';
import { fetchHackerNews } from '../src/services/newsFetcher.js';
import { normalizeUrl } from '../src/utils/url.js';

function story(name, title = 'AI release', ageHours = 1) {
  return {
    title, link: `https://example.invalid/${name}`, source: 'Fixture',
    description: 'A developer tool was released.', hnScore: 0,
    publishedAt: new Date(Date.now() - ageHours * 3_600_000).toISOString(),
  };
}

function harness(context, options = {}) {
  const logs = [];
  context.mock.method(console, 'log', (...values) => logs.push(values.join(' ')));
  context.mock.method(globalThis, 'fetch', async () => { throw new Error('Tests must not access the network.'); });
  const config = {
    dbUrl: 'postgresql://fixture@example.invalid/test', aiApiKey: 'fixture-key',
    geminiModel: 'fixture-model', resendApiKey: 'fixture-key',
    emailFrom: 'sender@example.invalid', emailTo: 'reader@example.invalid',
    maxArticleAgeHours: 25, topArticlesCount: 2, ...options.config,
  };
  const calls = { initialized: 0, fetched: 0, prompts: [], emails: [], recorded: [], events: [] };
  const sentLinks = new Set(options.sentLinks ?? []);
  const services = {
    async initDB() {
      calls.initialized++;
      if (options.dbError) throw new Error(options.dbError);
    },
    async fetchAllNews() {
      calls.fetched++;
      if (options.fetchError) throw new Error(options.fetchError);
      return options.articles ?? [story('first')];
    },
    async filterUnseen(articles) {
      return articles.filter((article) => !sentLinks.has(article.link));
    },
    async summarizeAndFilter(articles, settings) {
      return summarizeAndFilter(articles, settings, async (request) => {
        calls.prompts.push(JSON.parse(request.prompt));
        if (options.aiError) throw new Error(options.aiError);
        return { output: options.output ?? { selected: [{ index: 0, summary: 'Fixture summary.' }] } };
      });
    },
    async sendEmail(email, settings) {
      const result = await sendEmail(email, settings, { emails: { send: async (payload) => {
        calls.emails.push(payload);
        return options.resendResponse ?? { data: { id: 'accepted-fixture-id' }, error: null };
      } } });
      calls.events.push('accepted');
      return result;
    },
    async markAsSent(articles) {
      calls.recorded.push(articles);
      calls.events.push('persist');
      if (options.recordError) throw new Error(options.recordError);
      for (const article of articles) sentLinks.add(article.link);
    },
  };
  return { config, services, calls, sentLinks, logs };
}

test('preview filters, deduplicates, ranks, validates summaries, and renders without email credentials', async (t) => {
  const high = story('high', 'AI security release');
  const low = story('low', 'Cloud update');
  const undated = { ...story('undated', 'Research note'), description: '', publishedAt: null };
  const sent = story('sent');
  const h = harness(t, {
    articles: [low, story('old', 'AI release', 26), high, { ...high, title: 'Duplicate copy' }, story('future', 'AI release', -24), sent, undated],
    sentLinks: [sent.link],
    config: { resendApiKey: undefined, emailFrom: undefined, emailTo: undefined },
    output: { selected: [{ index: 0, summary: 'Summary with <script>markup</script>.' }, { index: 1, summary: 'Second summary.' }] },
  });
  await runAgent(h.config, { services: h.services });
  assert.deepEqual(h.calls.prompts[0].candidates.map((article) => article.title), [high.title, low.title, undated.title]);
  assert.equal(h.calls.prompts[0].maxStories, 2);
  assert.ok(h.logs.some((line) => line.includes(high.link) && line.includes('Summary with <script>markup</script>.')));
  assert.equal(h.calls.emails.length, 0);
  assert.equal(h.calls.recorded.length, 0);
  assert.deepEqual([...h.sentLinks], [sent.link]);
});

test('send mode renders both bodies, escapes HTML, and persists only after acceptance', async (t) => {
  const h = harness(t, { output: { selected: [{ index: 0, summary: 'A summary with <script>markup</script> & details.' }] } });
  await runAgent(h.config, { shouldSend: true, services: h.services });
  assert.equal(h.calls.emails.length, 1);
  const email = h.calls.emails[0];
  assert.equal(email.from, h.config.emailFrom);
  assert.equal(email.to, h.config.emailTo);
  assert.ok(email.subject.startsWith('Briefly — '));
  assert.ok(email.html.includes('&lt;script&gt;markup&lt;/script&gt; &amp; details.'));
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.text.includes('https://example.invalid/first'));
  assert.ok(h.calls.events.indexOf('accepted') < h.calls.events.indexOf('persist'));
  assert.equal(h.calls.recorded[0][0].link, 'https://example.invalid/first');
});

test('rerunning with the same sent articles skips AI, email, and additional writes', async (t) => {
  const h = harness(t);
  await runAgent(h.config, { shouldSend: true, services: h.services });
  await runAgent(h.config, { shouldSend: true, services: h.services });
  assert.equal(h.calls.prompts.length, 1);
  assert.equal(h.calls.emails.length, 1);
  assert.equal(h.calls.recorded.length, 1);
  assert.equal(h.sentLinks.size, 1);
});

for (const [name, articles] of [['empty feeds', []], ['only stale or future articles', [story('old', 'AI release', 26), story('future', 'AI release', -24)]]]) {
  test(`${name} skip AI and delivery`, async (t) => {
    const h = harness(t, { articles });
    await runAgent(h.config, { shouldSend: true, services: h.services });
    assert.equal(h.calls.prompts.length, 0);
    assert.equal(h.calls.emails.length, 0);
    assert.equal(h.calls.recorded.length, 0);
  });
}

test('missing delivery settings fail before database, news, or AI requests', async (t) => {
  const h = harness(t, { config: { emailTo: undefined } });
  await assert.rejects(runAgent(h.config, { shouldSend: true, services: h.services }), /EMAIL_TO/);
  assert.equal(h.calls.initialized, 0);
  assert.equal(h.calls.fetched, 0);
  assert.equal(h.calls.prompts.length, 0);
});

for (const options of [{ dbError: 'Database offline' }, { fetchError: 'News sources failed' }, { aiError: 'AI unavailable' }]) {
  test(`${Object.values(options)[0]} stops delivery and persistence`, async (t) => {
    const h = harness(t, options);
    await assert.rejects(runAgent(h.config, { shouldSend: true, services: h.services }), new RegExp(Object.values(options)[0]));
    assert.equal(h.calls.emails.length, 0);
    assert.equal(h.calls.recorded.length, 0);
  });
}

test('invalid AI indices stop delivery', async (t) => {
  const h = harness(t, { output: { selected: [{ index: 999, summary: 'Invalid selection.' }] } });
  await assert.rejects(runAgent(h.config, { shouldSend: true, services: h.services }), /invalid article selection/);
  assert.equal(h.calls.emails.length, 0);
  assert.equal(h.calls.recorded.length, 0);
});

test('an empty AI selection skips email and persistence', async (t) => {
  const h = harness(t, { output: { selected: [] } });
  await runAgent(h.config, { shouldSend: true, services: h.services });
  assert.equal(h.calls.emails.length, 0);
  assert.equal(h.calls.recorded.length, 0);
});

for (const [name, response] of [
  ['Resend rejection', { data: null, error: { message: 'Recipient rejected' } }],
  ['missing acceptance ID', { data: {}, error: null }],
]) {
  test(`${name} leaves articles unrecorded`, async (t) => {
    const h = harness(t, { resendResponse: response });
    await assert.rejects(runAgent(h.config, { shouldSend: true, services: h.services }));
    assert.equal(h.calls.emails.length, 1);
    assert.equal(h.calls.recorded.length, 0);
    assert.equal(h.sentLinks.size, 0);
  });
}

test('recording failure reports the accepted email ID and avoids retrying delivery', async (t) => {
  const h = harness(t, { recordError: 'Database write failed' });
  await assert.rejects(runAgent(h.config, { shouldSend: true, services: h.services }), /accepted-fixture-id.*recording sent articles failed.*Check Resend before retrying/);
  assert.equal(h.calls.emails.length, 1);
  assert.equal(h.sentLinks.size, 0);
  assert.ok(!h.logs.some((line) => line.startsWith('Recorded ')));
});

test('normalizeUrl removes tracking parameters and fragments but keeps other parameters', () => {
  assert.equal(
    normalizeUrl('https://example.invalid/Story?id=7&utm_source=x&utm_medium=y&fbclid=z#top'),
    'https://example.invalid/Story?id=7',
  );
  assert.equal(normalizeUrl('https://example.invalid/story?utm_campaign=a'), 'https://example.invalid/story');
  assert.equal(normalizeUrl('https://example.invalid/story?a=1'), 'https://example.invalid/story?a=1');
});

test('collected article links are normalized', async (t) => {
  const responses = {
    '/topstories.json': [1],
    '/item/1.json': { id: 1, type: 'story', title: 'Tracked link', url: 'https://example.invalid/a?utm_source=hn', score: 10, time: 1700000000 },
  };
  t.mock.method(globalThis, 'fetch', async (url) => {
    const key = Object.keys(responses).find((path) => String(url).endsWith(path));
    return { ok: true, json: async () => responses[key] };
  });

  const articles = await fetchHackerNews('https://hn.invalid/v0');
  assert.equal(articles.length, 1);
  assert.equal(articles[0].link, 'https://example.invalid/a');
});

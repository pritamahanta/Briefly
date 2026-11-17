# Daily Tech News Agent

A project being built step by step to collect tech news, select and summarize relevant stories, and email a daily digest.

## Planned stack

- Node.js with JavaScript ES modules.
- RSS feeds and the Hacker News API for news collection.
- PostgreSQL hosted on Neon to track sent articles.
- The Vercel AI SDK with Gemini or OpenRouter for selection and summaries.
- Resend for email delivery.
- GitHub Actions for a daily schedule.

The AI provider will be chosen before its integration step.

## Planned flow

Fetch news → remove duplicates and previously sent articles → rank stories → select and summarize with AI → format and send email → record sent articles.

Only record articles as sent after the email service accepts the email.

## Build steps

Each step ends with verification and a pause for a manual commit. Dependencies and configuration will be added when the corresponding feature needs them.

- [x] 1. Document the scope and build plan.
- [x] 2. Set up the Node.js project and runnable entry point.
- [x] 3. Add environment configuration and validation.
- [x] 4. Fetch and normalize RSS articles.
- [x] 5. Add Hacker News collection.
- [x] 6. Filter stale articles, remove duplicate links, and rank candidates.
- [ ] 7. Add PostgreSQL storage and filter previously sent articles.
- [ ] 8. Integrate AI selection and summaries.
- [ ] 9. Format the HTML and plain-text digest.
- [ ] 10. Send through Resend and record sent articles.
- [ ] 11. Verify the complete local flow.
- [ ] 12. Add the daily GitHub Actions workflow and document setup.

## Current status

The entry point loads configuration and collects news from two source groups in parallel:

- RSS feeds from TechCrunch, The Verge, and Ars Technica.
- Hacker News top stories through its public API, using Node.js's built-in `fetch`.

Articles use a common format with a title, link, description, source, publication date, and Hacker News score (zero for RSS articles).

Hacker News collection checks the first 60 top-story IDs in batches of up to 20 requests. Deleted stories, dead stories, and non-story items are skipped. Unix timestamps are converted to ISO dates. Story text is used when available; otherwise, the description shows the score and comment count. This step fetches API data, not full article pages.

Items without a valid HTTP or HTTPS article link are skipped. Missing titles become `Untitled`; missing or invalid publication dates become `null`. Descriptions are limited to 300 characters.

After collection, the program filters and ranks the articles, then prints a preview of the top results. AI selection, summaries, and email delivery are not implemented yet.

Failed feeds or individual Hacker News story requests produce warnings while successful results are kept. If one source group fails, the other can still provide articles. If both source groups fail, the program exits with an error. Hacker News requests have timeouts: 8 seconds for the story list and 5 seconds per story.

## Filtering and ranking

- Remove articles older than `MAX_ARTICLE_AGE_HOURS` and articles dated in the future.
- Keep undated articles without a recency bonus.
- Remove exact duplicate links within the current run, keeping the first eligible occurrence. Tracking parameters and different URL spellings are treated as different links.
- Rank by the score below, highest first. Equal scores keep their input order.

Each keyword group contributes its weight once when a whole word or phrase matches the title or description:

| Keyword group | Weight |
| --- | --- |
| AI and machine learning | 10 |
| Developer tools and releases | 8 |
| Security and regulation | 7 |
| Startups and funding | 5 |
| Major tech companies | 4 |
| Cloud and infrastructure | 2 |

Hacker News points add `points / 100`, capped at 5. Recency adds up to 3 points, decreasing linearly to zero over 12 hours. Scores are rounded to two decimal places.

The terminal preview shows up to `TOP_ARTICLES_COUNT` articles. All ranked articles remain available for later processing. Filtering previously sent articles will be added with PostgreSQL.

## Run locally

Requires Node.js, npm, and internet access. No API keys are needed for the current step.

Install dependencies and create your local configuration:

```bash
npm install
cp .env.example .env
```

Then run:

```bash
npm start
```

Example output before the ranked-title preview (counts vary):

```text
Daily Tech News Agent: configuration loaded.
Maximum article age: 25 hours.
Maximum stories per digest: 8.
Fetched 50 articles from RSS.
Fetched 59 articles from Hacker News.
Fetched 109 articles in total.
Retained 72 articles after age filtering and deduplication.
```

To restart automatically when source files change:

```bash
npm run dev
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `MAX_ARTICLE_AGE_HOURS` | `25` | Maximum article age in hours. |
| `TOP_ARTICLES_COUNT` | `8` | Maximum number of stories in a digest. |

Both values must be positive whole numbers. Invalid values stop the program with an error. Missing values use the defaults, so the program can also run without a `.env` file. Existing environment variables take precedence over `.env` values.

Your `.env` file is ignored by Git. API keys and service-specific settings will be added when their integrations are implemented.

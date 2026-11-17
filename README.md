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
- [x] 7. Add PostgreSQL storage and filter previously sent articles.
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

The database integration initializes an `articles` table, removes previously sent links, and closes connections when the run ends. After collection, the program filters and ranks the unseen articles, then prints a preview. Preview runs do not mark articles as sent. AI selection, summaries, and email delivery are not implemented yet.

Neon CLI setup, deployment, database integration checks, and the complete collection-and-preview run have been verified.

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

The terminal preview shows up to `TOP_ARTICLES_COUNT` articles. All ranked articles remain available for later processing. Previously sent links are checked against PostgreSQL before ranking.

## Run locally

Development uses Node.js 24, npm, and internet access. A PostgreSQL connection string is required. No AI or email API keys are needed yet.

Install dependencies and create your local configuration:

```bash
npm install
cp .env.example .env
```

Set up Neon as described below, then run:

```bash
npm start
```

The program prints database initialization, article counts, unseen article counts, and a ranked preview. Counts vary with the live feeds.

To restart automatically when source files change:

```bash
npm run dev
```

## Neon setup

Install the CLI and sign in from your terminal:

```bash
npm i -g neon@latest
neon login
```

For a fresh checkout, link your own organization, project, and branch:

```bash
neon init -y --org-id <organization-id> --project-id <project-id> --branch production --services postgres
```

Deploy the PostgreSQL configuration:

```bash
neon deploy
```

The CLI writes `DATABASE_URL` and the branch's other connection settings to `.env` when it exists, otherwise `.env.local`. The app reads both files, with `.env.local` taking precedence. Use `sslmode=verify-full` in `DATABASE_URL` and `DATABASE_URL_UNPOOLED`, preserving the other query parameters. Check this again after pulling new connection settings. See [Neon's connection guide](https://neon.com/docs/connect/connect-from-any-app).

The runtime uses `pg` with parameterized SQL and one `articles` table. Exact article URLs are hashed with SHA-256 for lookup; URL paths keep their original case. `markAsSent()` is implemented for the later email step and must only run after the email service accepts the digest.

## Verification

```bash
npm run build
npm run test:db
npm start
```

This is a plain JavaScript worker. The build command checks source syntax and `neon.ts`; it does not generate compiled files. The database check uses unique test URLs, verifies inserts and sent-article filtering, and deletes its own test rows afterward.

The start, dev, and database-test commands allow 2 seconds per connection attempt when Node selects IPv4 or IPv6 addresses. This avoids premature address-selection timeouts on higher-latency connections while keeping both address families enabled.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Required | PostgreSQL connection string pulled by Neon. |
| `MAX_ARTICLE_AGE_HOURS` | `25` | Maximum article age in hours. |
| `TOP_ARTICLES_COUNT` | `8` | Maximum number of stories in a digest. |

The two numeric settings must be positive whole numbers. Missing numeric settings use their defaults. `DATABASE_URL` must be a PostgreSQL connection string. Invalid settings stop the program with an error. Existing environment variables take precedence over values in the local files.

The `.env`, `.env.local`, and local `.neon` link files are ignored by Git. AI and email API keys will be added when those integrations are implemented.

# Daily Tech News Agent

A project being built step by step to collect tech news, select and summarize relevant stories, and email a daily digest.

## Planned stack

- Node.js with JavaScript ES modules.
- RSS feeds and the Hacker News API for news collection.
- PostgreSQL hosted on Neon to track sent articles.
- The Vercel AI SDK with Gemini for selection and summaries.
- Resend for email delivery.
- GitHub Actions for a daily schedule.

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
- [x] 8. Integrate AI selection and summaries.
- [x] 9. Format the HTML and plain-text digest.
- [x] 10. Send through Resend and record sent articles.
- [ ] 11. Verify the complete local flow.
- [ ] 12. Add the daily GitHub Actions workflow and document setup.

## Current status

The entry point loads configuration and collects news from two source groups in parallel:

- RSS feeds from TechCrunch, The Verge, and Ars Technica.
- Hacker News top stories through its public API, using Node.js's built-in `fetch`.

Articles use a common format with a title, link, description, source, publication date, and Hacker News score (zero for RSS articles).

Hacker News collection checks the first 60 top-story IDs in batches of up to 20 requests. Deleted stories, dead stories, and non-story items are skipped. Unix timestamps are converted to ISO dates. Story text is used when available; otherwise, the description shows the score and comment count. This step fetches API data, not full article pages.

Items without a valid HTTP or HTTPS article link are skipped. Missing titles become `Untitled`; missing or invalid publication dates become `null`. Descriptions are limited to 300 characters.

The database integration initializes an `articles` table, removes previously sent links, and closes connections when the run ends. After collection, the program filters and ranks unseen articles, then uses Gemini to select and summarize stories. It formats HTML and plain-text versions of the digest and prints the plain-text preview.

`npm start` is a preview and does not send email or mark articles as sent. `npm run send` sends the digest through Resend, then records its selected articles only after Resend returns an accepted email ID. Empty digests are skipped.

Neon setup, database integration, the preview flow, and live Resend submission with sent-article persistence have been verified.

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

Previously sent links are checked against PostgreSQL before ranking. The highest-ranked candidates are then passed to Gemini.

## AI selection and summaries

- Send at most 30 ranked, unseen candidates to Gemini.
- Select up to `TOP_ARTICLES_COUNT` stories, removing similar coverage of the same story.
- Request summaries based only on supplied titles and feed descriptions. Full article pages are not fetched.
- Use structured JSON output and validate article indices, duplicate selections, summary text, and the selection limit.
- Keep titles, links, sources, dates, and scores from the original records; the model supplies only indices and summaries.
- Skip the AI request when there are no candidates. Provider failures or invalid selections stop the run with an error.

The request has a 60-second total timeout and up to two SDK retries for retryable failures. Summaries are limited to 1,200 characters each. Gemini is instructed to use 2-3 short sentences when the supplied information supports them and a shorter summary when information is limited.

## Email formatting

`formatEmail()` returns `{ subject, html, text }` with a dated subject and heading, story count, numbered stories, sources, summaries, and article links. Both versions keep the selected story order. Dates use `Asia/Kolkata` consistently across local and scheduled runs.

The HTML uses inline styles and a table layout. Titles, sources, summaries, and link attributes are escaped, and links must use HTTP or HTTPS. An empty selection produces a "No new stories today" message.

The plain-text version is printed by `npm start`. Live delivery sends both versions. Formatting itself does not write files or contact an email service. No additional dependency or API key is required for formatting.

## Email delivery

`npm run send` validates the email settings before fetching news. After selection and formatting, it sends the subject, HTML, and plain text to the configured recipient through Resend. It requires a returned email ID before recording the selected articles in PostgreSQL. It does not send when no new articles remain or Gemini selects no stories.

The email request has a 30-second timeout and is not automatically retried. Failed sends leave the articles unrecorded. Resend acceptance is separate from inbox delivery. If the request times out, or if recording fails after acceptance, check Resend before retrying; email submission and database recording are separate operations.

## Run locally

Development uses Node.js 24, npm, and internet access. A PostgreSQL connection string and Gemini API key are required for the preview. Live delivery also requires the Resend settings below.

Install dependencies and create your local configuration:

```bash
npm install
cp .env.example .env
```

Set up Neon and Gemini as described below, then run:

```bash
npm start
```

The program prints database initialization, article counts, unseen article counts, and the plain-text digest preview. Counts vary with the live feeds. Each run with eligible candidates makes a Gemini API request.

To send a real digest and record its articles as sent:

```bash
npm run send
```

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

## Gemini setup

Create an API key in [Google AI Studio](https://aistudio.google.com/apikey), then add these settings to your existing `.env` without replacing the database settings:

```dotenv
AI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

The model is configurable. The default is [Gemini 3.5 Flash-Lite](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite). Model access and quotas depend on your Google project. Keep the API key in the ignored environment file.

## Resend setup

Create a key in [Resend API Keys](https://resend.com/api-keys), then add these settings to your existing `.env`:

```dotenv
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=onboarding@resend.dev
EMAIL_TO=your_resend_account_email
```

Use one plain email address for each address setting. There is no fallback recipient or sender. Resend's test sender can only send to the email address associated with your Resend account. For other recipients, verify a sending domain and set `EMAIL_FROM` to an address on it. See [Resend's test-domain guidance](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

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
| `AI_API_KEY` | Required for AI requests | Gemini API key from Google AI Studio. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model used for selection and summaries. |
| `RESEND_API_KEY` | Required for sending | Resend API key. |
| `EMAIL_FROM` | Required for sending | Single sender email address. |
| `EMAIL_TO` | Required for sending | Single recipient email address. |
| `MAX_ARTICLE_AGE_HOURS` | `25` | Maximum article age in hours. |
| `TOP_ARTICLES_COUNT` | `8` | Maximum number of stories in a digest. |

The two numeric settings must be positive whole numbers. Missing numeric settings use their defaults. `DATABASE_URL` must be a PostgreSQL connection string. Invalid settings stop the program with an error. Existing environment variables take precedence over values in the local files.

The `.env`, `.env.local`, and local `.neon` link files are ignored by Git. Database checks do not require Gemini or Resend credentials. Preview runs do not require Resend credentials.

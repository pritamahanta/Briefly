# Daily Tech News Agent

A project being built step by step to collect tech news, select and summarize relevant stories, and email a daily digest.

## Planned stack

- Node.js with JavaScript ES modules.
- RSS feeds, the Hacker News API, and Reddit for news collection.
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
- [ ] 4. Fetch and normalize RSS articles.
- [ ] 5. Add Hacker News collection.
- [ ] 6. Add Reddit collection.
- [ ] 7. Filter stale articles, remove duplicate links, and rank candidates.
- [ ] 8. Add PostgreSQL storage and filter previously sent articles.
- [ ] 9. Integrate AI selection and summaries.
- [ ] 10. Format the HTML and plain-text digest.
- [ ] 11. Send through Resend and record sent articles.
- [ ] 12. Verify the complete local flow.
- [ ] 13. Add the daily GitHub Actions workflow and document setup.

## Current status

The entry point loads and validates environment configuration using dotenv. News collection and delivery are not implemented yet. No external services have been connected.

## Run locally

Requires Node.js and npm. No API keys are needed for the current step.

Install dependencies and create your local configuration:

```bash
npm install
cp .env.example .env
```

Then run:

```bash
npm start
```

Expected output from the entry point:

```text
Daily Tech News Agent: configuration loaded.
Maximum article age: 25 hours.
Maximum stories per digest: 8.
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

# Briefly

A small Node.js agent that emails you a daily tech news digest. It pulls stories from RSS feeds and Hacker News, ranks them, asks Gemini to pick the best ones and summarize them, then sends the result through Resend. It runs on a schedule with GitHub Actions, so there is no server to maintain.

## How it works

```
Fetch news → drop old and duplicate links → drop already-sent links → rank → Gemini selects + summarizes → email → record as sent
```

- **Sources:** TechCrunch, The Verge, Ars Technica (RSS) and the top Hacker News stories.
- **Ranking:** keyword weights (AI, dev tools, security, startups, big tech, cloud), Hacker News points, and recency.
- **AI step:** Gemini sees titles and feed descriptions only (it never opens the article) and returns up to `TOP_ARTICLES_COUNT` picks with 2–3 sentence summaries. Output is schema-validated.
- **No repeats:** tracking parameters (`utm_*`, `fbclid`, `gclid`, `mc_cid`, `mc_eid`) and URL fragments are stripped from links, then sent links are stored in PostgreSQL (Neon) and skipped on later runs. Articles are only recorded after Resend accepts the email.
- **Resilient fetching:** a failing feed or story logs a warning and the rest continue.

## Quick start

Requires Node.js 24+, a [Neon](https://neon.com) database, a [Gemini API key](https://aistudio.google.com/apikey), and a [Resend](https://resend.com/api-keys) key.

```bash
git clone https://github.com/pritamahanta/Briefly
cd Briefly
npm install
cp .env.example .env   # then fill in the values
```

```bash
npm start       # preview: prints the digest, sends nothing, records nothing
npm run send    # sends the digest and records the articles as sent
```

> `npm start` still calls Gemini when there are candidates, so it uses a little API quota.

## Configuration

Set these in `.env` locally, or as GitHub secrets/variables when deployed.

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | required | Neon connection string (copy it from the Neon dashboard). |
| `AI_API_KEY` | required | Gemini API key. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Any Gemini model your key can access. |
| `RESEND_API_KEY` | required to send | |
| `EMAIL_FROM` | required to send | Resend's `onboarding@resend.dev` works for testing. |
| `EMAIL_TO` | required to send | With the test sender, this must be your Resend account email. |
| `MAX_ARTICLE_AGE_HOURS` | `25` | Ignore older articles. |
| `TOP_ARTICLES_COUNT` | `8` | Max stories per digest. |

To send to other recipients, verify a domain in Resend and use an address on it for `EMAIL_FROM`.

## Deploy on GitHub Actions

The **Briefly** workflow in `.github/workflows/daily-digest.yml` runs every day at **8:00 AM IST** (02:30 UTC).

1. Push the repo to GitHub.
2. Go to **Settings → Secrets and variables → Actions** and add the secrets `DATABASE_URL`, `AI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`.
3. Optionally add the variables `GEMINI_MODEL`, `MAX_ARTICLE_AGE_HOURS`, `TOP_ARTICLES_COUNT`.
4. Test it once from **Actions → Briefly → Run workflow**. Leave `send_email` unchecked for a preview, or tick it to send for real.

Notes: scheduled runs can start late, only run from the default branch, and GitHub pauses schedules on public repos after 60 days without repo activity.

## Development

```bash
npm test         # unit tests with fake services; no network, no credentials
npm run test:db  # checks your real database (uses and cleans up its own test rows)
npm run check    # syntax-checks every file in src/
npm run dev      # preview mode with auto-restart
```

```
src/
  worker.js            entry point (preview or --send)
  agent.js             the pipeline
  services/            newsFetcher, aiService, formatter, emailService
  utils/               env config, articleFilter, scorer, url
  db/dbService.js      Postgres: sent-article tracking
test/agent.test.js     pipeline tests
```

## Known limitations

- Duplicate detection is by URL after tracking parameters are removed, so the same story at different URLs (for example, two outlets covering it) can still appear twice. Gemini is asked to keep one version of each story.
- Summaries come from feed descriptions, so they can be thin for headline-only items.
- If the email is accepted but the database write fails, the next run may resend those stories. The error message tells you to check Resend first.

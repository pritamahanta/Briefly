# Daily Tech News Agent

A project being built step by step to collect tech news, select and summarize relevant stories, and email a daily digest.

## Reference

Based on [Dutta2005/daily-tech-news-agent](https://github.com/Dutta2005/daily-tech-news-agent).

Initial review: commit [`25c94c1`](https://github.com/Dutta2005/daily-tech-news-agent/tree/25c94c1a0a146ea0e9acd98222cf2afa2c688c73).

The reference uses:

- Node.js with JavaScript ES modules.
- RSS feeds, the Hacker News API, and Reddit for news collection.
- PostgreSQL hosted on Neon to track sent articles.
- The Vercel AI SDK with Gemini or OpenRouter for selection and summaries.
- Resend for email delivery.
- GitHub Actions for a daily schedule.

We will consult the relevant reference files at each implementation step. Any change or replacement will be discussed before implementation, including minor changes. The AI provider will be chosen before its integration step.

## Planned flow

Fetch news → remove duplicates and previously sent articles → rank stories → select and summarize with AI → format and send email → record sent articles.

Only record articles as sent after the email service accepts the email.

## Build steps

Each step ends with verification and a pause for a manual commit. Dependencies and configuration will be added when the corresponding feature needs them.

- [x] 1. Document the scope, reference, and build plan.
- [x] 2. Set up the Node.js project and runnable entry point.
- [ ] 3. Add environment configuration and validation.
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

The Node.js project and entry point are set up. The entry point currently prints a setup confirmation; news collection and delivery are not implemented yet. No dependencies or external services have been added.

## Run locally

Requires Node.js and npm. No API keys are needed for the current step.

```bash
npm start
```

Expected output from the entry point:

```text
Daily Tech News Agent: project setup complete.
```

To restart automatically when source files change:

```bash
npm run dev
```

# RSSHub ↔ OpenAPI (News module)

This project’s **News** module reads RSS/Atom XML from URLs built as `{RSSHUB_BASE_URL}{rsshubPath}` for each row in `services/news/news-sources.manifest.ts` (`newsSourcesManifest`). Paths follow [RSSHub](https://docs.rsshub.app/) route conventions; verify them on **your** instance.

---

## Environment

| Variable                          | Required | Description                                                                                                                                                      |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RSSHUB_BASE_URL`                 | No       | Base URL without trailing path (e.g. `https://rsshub.app`). Default: `https://rsshub.app`.                                                                       |
| `NEWS_RSS_FETCH_TIMEOUT_MS`       | No       | Per-source fetch timeout (ms), clamped 5000–120000. Default `30000`. Short timeouts cause `AbortError` while the same URL still loads in a browser.              |
| `NEWS_RSS_FETCH_CONCURRENCY`      | No       | Max parallel upstream requests, clamped 1–8. Default `2`. Lower (e.g. `1`) if the instance returns `503` under burst.                                            |
| `NEWS_RSS_FETCH_MAX_ATTEMPTS`     | No       | Attempts per feed for retryable HTTP errors (`429`, `502`, `503`, `504`), clamped 1–5. Default `3` (backoff + jitter between tries). Set `1` to disable retries. |
| `NEWS_FEED_RECENT_HOURS`          | No       | Rolling window (hours) for `/api/news/feed`: keep items with `pubDate` within the last N hours (clamped 1–168). Default `24`.                                    |
| `NEWS_FEED_FAILED_RETRY_DELAY_MS` | No       | After a response with partial RSS failures, `after()` waits this long (ms) before re-fetching failed sources only; clamped 30000–300000, default `60000`.        |

---

## HTTP API (this service)

| Path                    | Role                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET /api/news/sources` | List sources + resolved base URL.                                                                                    |
| `GET /api/news/feed`    | Fetch, merge, dedupe, sort, **keep rolling recent window** (default last 24h), return JSON items (+ partial errors). |

---

## Cron: news feed pools

Optional **warm / refresh** of merged pools (same RSS merge + L1 + Upstash write as the `after()` background job). Use when you want fresher data on a schedule (e.g. every 10 minutes from [cron-job.org](https://cron-job.org/) or similar).

| Item             | Detail                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Path**         | `GET /api/cron/sync/news-feed-pools`                                                                                                                                          |
| **Auth**         | If `CRON_SECRET` is set: `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>` (same as other cron routes).                                                        |
| **Runtime**      | Node.js; `maxDuration` is raised for long runs (platform plan may still cap, e.g. Vercel Hobby ~10s).                                                                         |
| **Default work** | Refreshes **all five** manifest category pools in parallel (`NEWS_MANIFEST_CATEGORY_ORDER`).                                                                                  |
| **Query**        | `maxFeeds` (default 15, max 25), `region` (`cn` \| `hk_tw`), `categories=comma-separated-slugs` (subset), `allPool=1` (also refresh the API pool when `category` is omitted). |
| **Response**     | JSON envelope `data`: `{ ok, refreshed[], failures[], jobCount, durationMs, … }`.                                                                                             |

See `.env.example` (Cron / automation) for URL examples. Implementation: `app/api/cron/sync/news-feed-pools/route.ts`, `refreshNewsFeedMergedPool` in `services/news/feed-kv-cache.ts`.

---

## Data files

| File                                     | Role                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `services/news/news-sources.manifest.ts` | Curated list (`newsSourcesManifest`): `id`, `label`, `category`, `region`, `rsshubPath`, optional `defaultUrl` (outlet homepage for tag links when RSS link is missing). |

To align with the broader RSSHub pipeline described in `TODO.md` (filter scripts, allowlists, resolved hot routes), you can replace or extend this JSON with generated output once those scripts land in the repo.

---

## Operational notes

- Rate limits and blocking depend on the RSSHub host; prefer a **self-hosted** instance for production.
- Bursts of parallel fetches can trigger **503** on small reverse proxies; use `NEWS_RSS_FETCH_CONCURRENCY=1` and/or rely on built-in retries (`NEWS_RSS_FETCH_MAX_ATTEMPTS`).
- Some routes require parameters or cookies on public instances; entries that fail at runtime appear under `errors` in `/api/news/feed`.
- **eastday:** use `/eastday/24` (official example). Optional third segment is a **Chinese** category name (e.g. `国内`), not pinyin (`guonei`). Many instances only need the two-segment path with the default category.

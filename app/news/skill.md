# News API (agents)

- **Sources:** `GET /api/news/sources` — optional `category`, `region` (`cn` | `hk_tw`).
- **Feed:** `GET /api/news/feed` — optional `category`, `region`, `limit`, `offset` (pagination), `maxFeeds`. `mergeStats.hasMore` indicates more rows.

Configure `RSSHUB_BASE_URL` for your RSSHub instance. Source paths live in `services/news/news-sources.manifest.ts` (`newsSourcesManifest`). Optional `NEWS_FEED_RECENT_HOURS` (default 24): keep only items published within the last N hours.

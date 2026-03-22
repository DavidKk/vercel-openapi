# News API (agents)

- **Sources:** `GET /api/news/sources` — optional `category`, `sub` (flat list slug when `category` is set), `region` (`cn` \| `hk_tw` \| `intl`).
- **Feed:** `GET /api/news/feed` — prefer query **`list`** (flat slug, same as `/news/[slug]`). Legacy `category` + `sub` when `list` is omitted. Also optional `region`, `limit`, `offset`, `maxFeeds`, **`feedAnchor`** (first page `fetchedAt` ISO; use when `offset` > 0 for stable pagination), and at most one of **`feedCategory`** / **`feedKeyword`** / **`feedSourceId`**. Response includes `items`, `fetchedAt`, `baseUrl`, **`facets`**, optional **`sourceInventory`**, optional **`mergeStats`** (`hasMore` for pagination), optional **`errors`** per RSS source. Items may include optional **`imageUrl`** when the RSS parser finds a cover.

Configure `RSSHUB_BASE_URL` for your RSSHub instance. Source paths live in `services/news/config/news-sources.manifest.ts` (`newsSourcesManifest`). Rolling window length is **per list slug** (see `services/news/feed/published-recent-window.ts`); env **`NEWS_FEED_RECENT_HOURS`** applies only to the **no-list / no-category** merged pool.

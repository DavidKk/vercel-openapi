# News module (Spec)

Per-module spec for the News public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest data). Aggregates **latest** entries from configurable RSS feeds (typically [RSSHub](https://github.com/DIYgod/RSSHub) instances). No write API.

**Integration details:** [integrations/rsshub-openapi.md](../integrations/rsshub-openapi.md).

---

## Purpose

- Expose **phase 1** content categories from product planning (`general-news`, `tech-internet`, `social-platform`, `game-entertainment`, `science-academic`) and regions `cn` | `hk_tw` (international deferred). The checked-in **`services/news/news-sources.manifest.ts` manifest is `cn` only**; `region=hk_tw` on the API returns no sources until rows are added.
- **Fetch** RSS XML from a configurable base URL + per-source paths, **merge** items, **deduplicate** by normalized link, then **same UTC calendar day + identical normalized title** (min length, different URL, different source), **sort** by `pubDate` descending, **drop rows outside a rolling recent window** (`NEWS_FEED_RECENT_HOURS`, default **24 hours** from request time), **return** a capped JSON list.
- Sources are defined in `services/news/news-sources.manifest.ts` (`newsSourcesManifest`); operators can point `RSSHUB_BASE_URL` at a public or self-hosted RSSHub. Optional: `NEWS_RSS_FETCH_TIMEOUT_MS`, `NEWS_RSS_FETCH_CONCURRENCY`, `NEWS_RSS_FETCH_MAX_ATTEMPTS`, `NEWS_FEED_RECENT_HOURS` — see `integrations/rsshub-openapi.md`.

---

## Endpoints

| Method | Path                             | Description                                                                       |
| ------ | -------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/news/sources`              | List configured sources (optional `category`, `region`).                          |
| GET    | `/api/news/feed`                 | Aggregated feed: merged items + per-source fetch errors.                          |
| GET    | `/api/cron/sync/news-feed-pools` | Optional merged-pool warm / refresh (`CRON_SECRET` if set). See integrations doc. |

---

## Overview UI URL (`/news/[category]`)

- **`/news`** redirects to **`/news/general-news`** (or merges legacy `?category=` / `?query=` into the new shape).
- **Path** `[category]`: manifest tab slug (`general-news`, `tech-internet`, `social-platform`, `game-entertainment`, `science-academic`).
- **Query** (at most one list facet; `source` wins over `tag` over `keyword`):

| Param     | Meaning                                       |
| --------- | --------------------------------------------- |
| `tag`     | RSS feed category label → API `feedCategory`. |
| `keyword` | RSS keyword → API `feedKeyword`.              |
| `source`  | Manifest `sourceId` → API `feedSourceId`.     |

Legacy `?category=&query=fc,…` on `/news` is still accepted and normalized on redirect.

Implementation: `services/news/news-overview-url.ts` (`buildNewsOverviewHref`, `parseNewsFacetFromUrlSearchParams`, `resolveNewsFeedLandingHrefFromRootSearch`, legacy `parseNewsOverviewQueryParam`).

---

## Request / response

### GET `/api/news/sources`

- **Query:** `category` (optional), `region` (optional, `cn` \| `hk_tw`).
- **Response:** `{ sources: NewsSourceConfig[], baseUrl: string }` — `baseUrl` is the resolved RSSHub base (from env or default). Read-only.

### GET `/api/news/feed`

- **Query:**
  - `category` (optional) — one of the five phase-1 **article** taxonomies; filters returned rows **after** the unified merge (does not limit which RSS sources are fetched).
  - `region` (optional) — `cn` \| `hk_tw`; limits which **sources** are requested (not the same as `category` above).
  - `limit` (optional) — page size (max items returned this response); default `30`, max `100`.
  - `offset` (optional) — skip this many rows after merge, recent window, and optional `category` filter; default `0`, max `2000` (pagination; full merge still runs each request).
  - `maxFeeds` (optional) — max number of source feeds to request; default `15`, max `25` (controls upstream load; pool is ordered by manifest across all article categories).
  - `feedAnchor` (optional) — ISO timestamp from the first page `fetchedAt`; use on later pages so the rolling recent window matches the session.
- **Response:** `{ items: AggregatedItem[], fetchedAt: string (ISO), facets: NewsFeedFacets, errors?: { sourceId, message }[], mergeStats?: NewsFeedMergeStats }`. **`facets`** — histograms over the full merged pool for this request (before `offset`/`limit`): `categories[]`, `keywords[]`, `sources[]` each with `{ value, count }` or `{ sourceId, label, count }`, sorted by count desc (for filter UIs; not limited to the current page of `items`).  
  Each item: `title`, `link`, `publishedAt` (ISO or null), `summary` (nullable), `sourceId`, `sourceLabel`, `category` (module taxonomy), `region`, optional `feedCategories` (RSS `category` / `dc:subject`, deduped), optional `feedKeywords` (`media:keywords` / `keywords`, split on comma-like delimiters), optional `alsoFromSources`, optional `platformTags` for multi-source UI.  
  **`mergeStats`** (when present): merge/dedupe diagnostics — `sourcesRequested`, `sourcesWithItems`, `sourcesEmptyOrFailed`, `rawItemCount`, `droppedMissingLink`, `duplicateDropped` (same normalized URL), `duplicateDroppedByTitle` (same UTC calendar day + identical normalized title, different URL, different source), `droppedOutsideRecentWindow` (missing/invalid `publishedAt` or older than window), `recentWindowHours` (from `NEWS_FEED_RECENT_HOURS`, default 24), `uniqueAfterDedupe` (count after optional `category` filter, before `offset` slice), `offset` (applied skip, clamped), `hasMore`, `returnedItems`, `truncatedByLimit` (items not in this page after `offset`).
- **Sort order:** newer `publishedAt` first (missing dates last).
- **Recent window:** after dedupe/sort, items whose `publishedAt` is older than `recentWindowHours` (rolling, from server “now”) are dropped; missing/unparseable dates are dropped.
- **Caching:** short `s-maxage` (e.g. 60s) + `stale-while-revalidate` — **latest** snapshot semantics; not historical.

---

## Errors and boundaries

- Upstream RSSHub or network failures for a source are reported in `errors[]`; other sources still contribute items.
- Invalid `category` / `region` / numeric params → `400` with a short message.
- Empty `items` is valid if all fetches fail or feeds parse to zero entries.

---

## Caching (server)

Aligned with [.ai/knowledge/glossary.md](../../knowledge/glossary.md) **L1 / L2** flow for `GET /api/news/feed`:

- **Merged pool only** — L1/L2 store the **full merged + deduped pool** for one **stable key**: resolved `RSSHUB_BASE_URL`, manifest list `category` string (`''` when the API omits `category`, else a phase-1 slug), `region`, and `maxFeeds`. The key does **not** include `feedAnchor`, rolling window, RSS list facets (`feedCategory` / `feedKeyword` / `feedSourceId`), `limit`, or `offset`.
- **Per request** — After a hit, `pruneNewsFeedPoolPayloadForWindow` applies `NEWS_FEED_RECENT_HOURS` relative to `feedAnchor` (or `now`). Then `sliceNewsFeedPageFromPool` applies optional RSS facet filter + `offset`/`limit` in memory. Switching sidebar tags reuses the same pool → fast.
- **L1** — In-memory LRU (fewer entries than small payloads; pools are larger). **L2** — Upstash when configured. **Write-through on pool miss:** L2 then L1.

Pool L2 TTL: `NEWS_FEED_KV_TTL_SECONDS` (default **86400**, clamp **3600–86400**). Background reconcile merges fresh RSS into the cached pool with dedupe when served from cache and `lastMergedAt` is older than `NEWS_FEED_POOL_REFRESH_MIN_INTERVAL_MS` (HTTP route uses Node + `after()`). If the merged pool carries per-source `errors` (fetch failures), a **second** `after()` waits `NEWS_FEED_FAILED_RETRY_DELAY_MS` (default **60s**, clamp **30s–300s**) then re-fetches **only** those `sourceId`s and reconciles into L1/KV (one pending job per pool key). Optional **external cron**: `GET /api/cron/sync/news-feed-pools` (see [integrations/rsshub-openapi.md](../integrations/rsshub-openapi.md#cron-news-feed-pools)). Implementation: `services/news/feed-kv-cache.ts`, `pruneNewsFeedPoolPayloadForWindow` / `reconcileNewsFeedPoolAfterRssFetch` / `reconcileNewsFeedPoolAfterFailedSourceRetry` in `aggregate-feed.ts`.

---

## Semantics (latest only)

- Each response reflects a **live** aggregation at request time (subject to cache headers), not stored history.
- Any future “as of date” or archived snapshots must use a **separate path** and spec.

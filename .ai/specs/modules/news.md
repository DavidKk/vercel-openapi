# News module (Spec)

Per-module spec for the News public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest data). Aggregates **latest** entries from configurable RSS feeds (typically [RSSHub](https://github.com/DIYgod/RSSHub) instances). No write API.

**Integration details:** [integrations/rsshub-openapi.md](../integrations/rsshub-openapi.md).

---

## Purpose

- Expose **phase 1** manifest **categories** (`general-news`, `tech-internet`, `game-entertainment`, `science-academic`) and source **regions** `cn` | `hk_tw` | `intl`. Each manifest source has a **`subcategory`** slug; the overview UI and preferred feed query use a **flat list slug** (`/news/[slug]`, `GET /api/news/feed?list=`) — unique slugs across categories (see `NEWS_LIST_SLUGS_ORDER` in `config/news-subcategories.ts`). Legacy `category` + `sub` on the API still map to the same pools. The checked-in **`services/news/config/news-sources.manifest.ts`** includes `cn`, `hk_tw`, and `intl` rows where configured. (The old `social-platform` category and `depth` list were removed; bookmarked `/news/depth` **redirects** to `/news/headlines`.)
- **Fetch** RSS XML from a configurable base URL + per-source paths, **merge** items, **deduplicate** by normalized link, then **same UTC calendar day + identical normalized title** (min length, different URL, different source), **sort** by `pubDate` descending, **drop rows outside a rolling recent window** (per **flat list slug** via `feed/published-recent-window.ts`, e.g. headlines **24h**; for the **no-list / no-category** pool only, `NEWS_FEED_RECENT_HOURS` default **24h**), **return** a capped JSON list.
- Sources are defined in `services/news/config/news-sources.manifest.ts` (`newsSourcesManifest`); operators can point `RSSHUB_BASE_URL` at a public or self-hosted RSSHub. Optional: `NEWS_RSS_FETCH_TIMEOUT_MS`, `NEWS_RSS_FETCH_CONCURRENCY`, `NEWS_RSS_FETCH_MAX_ATTEMPTS`, `NEWS_FEED_RECENT_HOURS` — see `integrations/rsshub-openapi.md`.

---

## Endpoints

| Method | Path                             | Description                                                                       |
| ------ | -------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/api/news/sources`              | List configured sources (optional `category`, `sub`, `region`).                   |
| GET    | `/api/news/feed`                 | Aggregated feed: merged items + per-source fetch errors.                          |
| GET    | `/api/cron/sync/news-feed-pools` | Optional merged-pool warm / refresh (`CRON_SECRET` if set). See integrations doc. |

---

## Overview UI URL (`/news/[slug]`)

- **`/news`** redirects to **`/news/headlines`** (default flat list) or merges legacy `?category=` + optional `?sub=` / `?query=` / `?list=` into that shape.
- **Path** `[slug]`: flat list slug (`headlines`, `media`, `developer`, …) — unique across former top-level tabs (see `NEWS_LIST_SLUGS_ORDER`). The folder is named `[slug]` (not `[list]`) so the dynamic param does not clash with Next.js internals.
- **Legacy path** `/news/general-news` (old manifest category segment) **redirects** to the matching flat list (default first list slug for that category, or `?sub=` when valid).
- **API** `GET /api/news/feed` accepts **`list=`** (preferred, matches UI) or legacy **`category`** + optional **`sub`** for the same pool keys.
- **Query** (at most one list facet; `source` wins over `tag` over `keyword`):

| Param     | Meaning                                                                                  |
| --------- | ---------------------------------------------------------------------------------------- |
| `tag`     | RSS feed category label → API `feedCategory`.                                            |
| `keyword` | Topic chip → API `feedKeyword` (exact match on item `feedKeywords` or `feedCategories`). |
| `source`  | Manifest `sourceId` → API `feedSourceId`.                                                |

Legacy `?category=&query=fc,…` on `/news` is still accepted and normalized on redirect.

Implementation: `services/news/routing/news-overview-url.ts` (`buildNewsOverviewHref`, `parseNewsFacetFromUrlSearchParams`, `resolveNewsFeedLandingHrefFromRootSearch`, legacy `parseNewsOverviewQueryParam`).

---

## Request / response

### GET `/api/news/sources`

- **Query:** `category` (optional), `sub` (optional list slug when `category` is set; invalid/missing → default list slug for that category), `region` (optional, `cn` \| `hk_tw` \| `intl`).
- **Response:** `{ sources: NewsSourceConfig[], baseUrl: string }` — `baseUrl` is the resolved RSSHub base (from env or default). Read-only.

### GET `/api/news/feed`

- **Query:**
  - `list` (optional, **preferred**) — flat list slug (same as `/news/[slug]`). When set, `category` / `sub` are ignored; sources are filtered by resolved manifest `category` + `subcategory` for that slug.
  - `category` (optional) — one of the four phase-1 **manifest categories**: when set (and `list` omitted), only RSS sources whose manifest `category` matches are candidates; then `sub` (optional) selects manifest `subcategory` within that category (default first list slug when omitted); then `maxFeeds` caps the list. When both are omitted, the first `maxFeeds` sources in manifest order across **all** categories are merged.
  - `sub` (optional) — list slug when `category` is set; see `config/news-subcategories.ts`. Invalid values normalize to the default list slug for that category.
  - `region` (optional) — `cn` \| `hk_tw` \| `intl`; intersects with the source list above (orthogonal to list slug / category).
  - `limit` (optional) — page size (max items returned this response); default `30`, max `100`.
  - `offset` (optional) — skip this many rows after merge, recent window, and list construction; default `0`, max `2000` (pagination).
  - `maxFeeds` (optional) — max RSS sources to fetch for this request; default `15`, max `25` (applied **after** list/region source filtering).
  - `feedAnchor` (optional) — ISO timestamp from the first page `fetchedAt`; use on later pages so the rolling recent window matches the session.
- **Response:** `{ items: AggregatedItem[], fetchedAt: string (ISO), baseUrl: string, facets: NewsFeedFacets, errors?: { sourceId, message }[], mergeStats?: NewsFeedMergeStats, sourceInventory?: … }`. **`facets`** — histograms over the full merged pool for this request (before `offset`/`limit`): `categories[]`, `keywords[]`, `sources[]` each with `{ value, count }` or `{ sourceId, label, count }`, sorted by count desc (for filter UIs; not limited to the current page of `items`).  
  Each item: `title`, `link`, `publishedAt` (ISO or null), `summary` (nullable), `sourceId`, `sourceLabel`, `category` (module taxonomy), `region`, optional **`imageUrl`** (cover URL from RSS `media:*` / `enclosure` / first `img` in description when parseable), optional `feedCategories` (RSS `category` / `dc:subject`, deduped), optional `feedKeywords` (`media:keywords` / `keywords`, split on comma-like delimiters), optional `alsoFromSources`, optional `platformTags` for multi-source UI.  
  **`sourceInventory`** (optional): per-source `poolCount` / `parsedCount` for the sidebar.  
  **`mergeStats`** (when present): merge/dedupe diagnostics — `sourcesRequested`, `sourcesWithItems`, `sourcesEmptyOrFailed`, `rawItemCount`, `droppedMissingLink`, `duplicateDropped` (same normalized URL), `duplicateDroppedByTitle` (same UTC calendar day + identical normalized title, different URL, different source), `droppedOutsideRecentWindow` (older than rolling window; **missing or unparseable `publishedAt` are kept**), `recentWindowHours` (per list slug via `getNewsFeedRecentWindowHoursForListSlug`, or `NEWS_FEED_RECENT_HOURS` for the no-list pool), `uniqueAfterDedupe` (count in the list-scoped pool after dedupe/window, before `offset` slice), `offset` (applied skip, clamped), `hasMore`, `returnedItems`, `truncatedByLimit` (items not in this page after `offset`).
- **Sort order:** newer `publishedAt` first (missing dates last).
- **Recent window:** after dedupe/sort, items with parseable `publishedAt` older than `recentWindowHours` (relative to `feedAnchor` or request “now”) are dropped; **missing or unparseable `publishedAt` are kept** (many RSSHub routes omit or garble dates).
- **Caching (HTTP):** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` — **latest** snapshot semantics; not historical.
- **Caching (browser overview):** the `/news/[slug]` client may hydrate the **first page** from **IndexedDB** (TTL **300s**, aligned with `stale-while-revalidate`), then refresh from the API — see `services/news/browser/idb-cache.ts`.

---

## RSS facet labels: categories vs Topics (`facets.keywords`)

Shared **per-item** cleanup (before pool histograms): `dedupeFacetLabelListForItem`, `filterRssFacetLabels` (`rss-facet-label-filter.ts`), **strip outlet / manifest source names** (`strip-feed-keywords-matching-source-labels.ts`), **strip redundant taxonomy chips** (`strip-redundant-topic-category-labels.ts` — generic list/tab words such as 科技 / 要闻 / `Tech media` so Topics do not repeat site navigation).

### `facets.categories` (RSS `category` / `dc:subject`)

**Pool histogram:** `buildFeedFacetsFromPool` → `mergeFacetHistogramRowsBySubstring` (`dedupe-facet-label-substrings.ts`): deterministic **substring / ordered-subsequence** pass, then **fuzzball** clustering, then one **representative** label per cluster.

| Stage                   | Intended approach                                       | In repo                                                                                                                                                                                                                                                                               | Notes / next steps                                                            |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| String normalization    | Lowercase, strip punctuation / spaces                   | **Step 2:** `normalizeFacetLabelSurface` (ASCII edge punct strip, collapse whitespace, Latin `toLowerCase` only) then **collapse consecutive repeated CJK runs** inside `facetNormKey`; fuzzball uses **`full_process: false`**. Fuzzy scoring normalizes both operands the same way. | **Step 2b (optional):** NFKC or full-width punctuation map if needed.         |
| Substring / containment | Drop shorter strings absorbed by longer                 | **`normSupersedes`:** `includes` + gated **ordered subsequence** for CJK (len ≥ 4, majority Han)                                                                                                                                                                                      | Runs before fuzzy clustering.                                                 |
| Fuzzy similarity        | fuzzball `ratio` / `partial_ratio` / `token_sort_ratio` | **Step 3:** **`partial_ratio`** (short ⊂ long, short ≥ 3); **char-spaced `token_sort_ratio`** (both ≥ 4, \|Δlen\| ≤ 2) if score **≥ 90**; else **same-length `ratio`** if both ≥ **`RATIO_MIN_BOTH_LEN` (4)** and **≥ `RATIO_SAME_LEN_MIN_SCORE` (86)** (Latin one-char typos ~86).   | Separate **`leven`** not used. **Optional:** tune `RATIO_SAME_LEN_MIN_SCORE`. |
| Clustering              | Group by threshold                                      | **Union–find** over label indices (`fuzzyCollapseDistinctLabels`, `fuzzyMergeHistogramDisplayMap`)                                                                                                                                                                                    | O(n²) pairwise compare; fine for typical facet cardinalities.                 |
| Representative          | Longest label; optional weight                          | **Step 4 (pool):** `pickBetterHistogramDisplay` — longer; same length → **higher summed pool `count`**; tie → surface-canonical → lex. **Per-item (no counts):** `pickBetterDisplayRaw` only.                                                                                         | **Step 5 (optional):** title frequency or dictionary preferred spelling.      |

Tuning: file-level constants at the top of `facets/dedupe-facet-label-substrings.ts`.

### Topics (`facets.keywords`) and per-item `feedKeywords`

**Source:** RSS `media:keywords` / `keywords` only — **no** segmentation, **no** statistical extraction from title or body.

**Per-item pipeline:** **literal** check against title+summary (`rss-feed-keyword-document-match.ts`), hard-filter noise (`finalize-news-item-topic-keywords.ts`), outlet + redundant-taxonomy strips above, **per-item cap** (`config/feed-keyword-budgets.ts`). No Chinese suffix/prefix rewriting (RSS strings are used as emitted aside from filtering). Responses run `attachFinalizedTopicKeywordsToNewsPool` so cached pools pick up rule changes.

**Pool histogram (`facets.keywords`):** counts each **exact** string from the per-item **union** of `feedCategories` ∪ `feedKeywords` (deduped once per article). Sorted by count, capped (`MAX_POOL_KEYWORD_FACETS`). **No** fuzzball merge on this histogram — sidebar strings must match **`itemMatchesFacetListFilter`** (`facet-list-filter.ts`) **exactly** on the item (`feedKeyword` matches either field; `feedCategory` / `tag` matches `feedCategories` only).

**Runtime:** RSS merge + facet clustering run on **Node** (`GET /api/news/feed`). `GET /api/news/sources` stays **Edge** and does not load this pipeline.

---

## Errors and boundaries

- Upstream RSSHub or network failures for a source are reported in `errors[]`; other sources still contribute items.
- Invalid `category` / `region` / numeric params → `400` with a short message.
- Empty `items` is valid if all fetches fail or feeds parse to zero entries.

---

## Caching (server)

Aligned with [.ai/knowledge/glossary.md](../../knowledge/glossary.md) **L1 / L2** flow for `GET /api/news/feed`:

- **Merged pool only** — L1/L2 store the **full merged + deduped pool** for one **stable key**: resolved `RSSHUB_BASE_URL`, manifest **`category`** string (`''` for the all-category pool), **`subcategory`** string (`''` for the all-category pool; else the normalized **flat list slug** — from `list=` or from legacy `category`+`sub`), **`region`**, **`maxFeeds`**, and **`recentWindowHours`** (from the list slug / env). The key does **not** include `feedAnchor`, RSS list facets (`feedCategory` / `feedKeyword` / `feedSourceId`), `limit`, or `offset`.
- **Per request** — After a hit, `pruneNewsFeedPoolPayloadForWindow` applies the same rolling window length relative to `feedAnchor` (or `now`). Then `sliceNewsFeedPageFromPool` applies optional RSS facet filter + `offset`/`limit` in memory. Switching sidebar tags reuses the same pool → fast.
- **L1** — In-memory LRU (fewer entries than small payloads; pools are larger). **L2** — Upstash when configured. **Write-through on pool miss:** L2 then L1.

Pool L2 TTL: `NEWS_FEED_KV_TTL_SECONDS` (default **86400**, clamp **3600–86400**). `GET /api/news/feed` serves L1/L2 when present or runs a **synchronous** RSS merge on miss; there is **no** post-response refresh or delayed failed-source retry on the HTTP route (stale pools update on the next miss, TTL expiry, or **external cron**). Optional **external cron**: `GET /api/cron/sync/news-feed-pools` (see [integrations/rsshub-openapi.md](../integrations/rsshub-openapi.md#cron-news-feed-pools)). Implementation: `services/news/feed/feed-kv-cache.ts`, `pruneNewsFeedPoolPayloadForWindow` / `reconcileNewsFeedPoolAfterRssFetch` / `reconcileNewsFeedPoolAfterFailedSourceRetry` in `feed/aggregate-feed.ts`.

---

## Semantics (latest only)

- Each response reflects a **live** aggregation at request time (subject to cache headers), not stored history.
- Any future “as of date” or archived snapshots must use a **separate path** and spec.

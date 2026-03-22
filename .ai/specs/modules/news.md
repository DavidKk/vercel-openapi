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
  - **RSS list facet** (optional, **at most one**): `feedCategory`, `feedKeyword`, or `feedSourceId` — same semantics as the overview URL `tag` / `keyword` / `source` query (filter the merged pool in memory after the window prune, then apply `offset`/`limit`). Implementation: `app/api/news/feed/route.ts`.
  - `retrySourceIds` (optional) — comma / semicolon / whitespace–separated manifest `sourceId`s; **only when `offset=0`**. Re-fetches and merges **only** those sources into the existing L1/L2 pool (single-flight on the server). Used by the overview when **`feedWarmup`** is present. Response may set **`X-News-Feed-Partial-Retry: 1`** when this path ran.
- **Response:** `{ items: AggregatedItem[], fetchedAt: string (ISO), baseUrl: string, facets: NewsFeedFacets, errors?: { sourceId, message }[], mergeStats?: NewsFeedMergeStats, sourceInventory?: …, feedWarmup?: … }`. **`facets`** — histograms over the full merged pool for this request (before `offset`/`limit`): `categories[]`, `keywords[]`, `sources[]` each with `{ value, count }` or `{ sourceId, label, count }`, sorted by count desc (for filter UIs; not limited to the current page of `items`).  
  Each item: `title`, `link`, `publishedAt` (ISO or null), `summary` (nullable), `sourceId`, `sourceLabel`, `category` (module taxonomy), `region`, optional **`imageUrl`** (cover URL from RSS `media:*` / `enclosure` / first `img` in description when parseable), optional `feedCategories` (RSS `category` / `dc:subject`, deduped), optional `feedKeywords` (`media:keywords` / `keywords`, split on comma-like delimiters), optional `alsoFromSources`, optional `platformTags` for multi-source UI.  
  **`sourceInventory`** (optional): per-source `poolCount` / `parsedCount` for the sidebar.  
  **`errors`** (when present): **hard** upstream / merge failures only. Transient issues (timeouts, merge budget skip phrasing, retryable HTTP) are split server-side: see **`feedWarmup`** below. When serving **stale-only** after an inline refresh failure, the API may **suppress** `errors` / `feedWarmup` noise (see route `inline_failed_stale` + `X-News-Pool-Stale`).
  **`feedWarmup`** (optional): when some sources are still classed as **warming**, `{ pending: true, sources: { sourceId, message }[], suggestedRetryAfterSeconds, suggestedManualRetryAfterSeconds }`. Constants default to **5** seconds (`NEWS_FEED_WARMUP_POLL_INTERVAL_SECONDS`, `NEWS_FEED_WARMUP_MANUAL_UNLOCK_SECONDS` in `services/news/feed/news-feed-source-issue.ts`). The **overview** client issues **at most one** follow-up first-page request with **`retrySourceIds`** for those ids; other clients may retry on their own schedule. Do not replace the whole list blindly.
  **`mergeStats`** (when present): merge/dedupe diagnostics — `sourcesRequested`, `sourcesWithItems`, `sourcesEmptyOrFailed`, `rawItemCount`, `droppedMissingLink`, `duplicateDropped` (same normalized URL), `duplicateDroppedByTitle` (same UTC calendar day + identical normalized title, different URL, different source), `droppedOutsideRecentWindow` (older than rolling window; **missing or unparseable `publishedAt` are kept**), `recentWindowHours` (per list slug via `getNewsFeedRecentWindowHoursForListSlug`, or `NEWS_FEED_RECENT_HOURS` for the no-list pool), `uniqueAfterDedupe` (count in the list-scoped pool after dedupe/window, before `offset` slice), `offset` (applied skip, clamped), `hasMore`, `returnedItems`, `truncatedByLimit` (items not in this page after `offset`).
- **Sort order:** newer `publishedAt` first (missing dates last).
- **Recent window:** after dedupe/sort, items with parseable `publishedAt` older than `recentWindowHours` (relative to `feedAnchor` or request “now”) are dropped; **missing or unparseable `publishedAt` are kept** (many RSSHub routes omit or garble dates).
- **Caching (HTTP):** `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` — **latest** snapshot semantics; not historical.
- **Caching (browser overview — L0):** per [.ai/knowledge/glossary.md](../../knowledge/glossary.md), **L0** is **IndexedDB**. The `/news/[slug]` client hydrates the **first page** from L0 (TTL **600s** `NEWS_FEED_OVERVIEW_IDB_TTL_MS`); when L0 is still fresh, reloads use it directly and skip the first-page network request. **Facet URLs** (`?tag=` / `?keyword=` / `?source=`) also use a **second row** keyed by `buildNewsFeedOverviewFacetIdbKey` storing the **server-filtered** first page so refresh within TTL does not fall back to “client filter the unfiltered L0 page” (often only a few rows). First-page network is skipped only when **that** facet row is fresh; an unfiltered fresh L0 must **not** skip the facet API call. Exception: if the cached payload still carried **`feedWarmup.pending`** sources, the client keeps the cached rows for paint, restores the cached **`warmupSources`** list for internal state, but does **not** treat that snapshot as a fresh hit, so reloads continue requesting the API to refill the missing sources. After TTL expiry, the client may still paint the stale snapshot first, then refresh from the API — see `services/news/browser/idb-cache.ts`. **Target** L0 behavior matches **Caching (server) → Target semantics** (fast paint, stale-on-failure, bounded refresh); full stack order **L0 → L1 → L2 → upstream**.

**Overview UI client (`app/news/components/NewsOverview/NewsOverview.tsx`) — aligned behavior**

- **Page size:** requests **`limit=20`** (`NEWS_OVERVIEW_PAGE_SIZE` in `app/news/lib/news-overview-ui.ts`); the API default when `limit` is omitted is **30** (see query docs above). L0 key is **one row per list slug** (`buildNewsFeedOverviewIdbKey(listSlug)` → `v1:overview:{slug}`); the stored snapshot is the **unfiltered** first page, then facets are applied in the client (`applyFacetFilterToCachedOverviewItems`).
- **Warmup refetch (one shot):** if **`feedWarmup.pending`** and `sources.length > 0`, the client sends **one** first-page request with **`retrySourceIds`** set to those source ids (no `setInterval`). There is **no** feed-column copy or manual retry button; the effect cleans up on navigation.
- **Head merge (no full list replace):** on a successful warmup refetch first page, the client **prepends** items whose stable key is not already in the list. Stable list identity: **`sourceId` + normalized title + `link`** — `getNewsFeedItemListKey` in `app/news/lib/news-feed-item-key.ts` (`mergeNewsFeedItemsPreferIncomingHead`). **`hasMore`**, **`errors`**, **`feedWarmup`**, **`fetchedAt`** (session anchor), **facets**, **sourceInventory**, and **total count** are updated from the response.
- **UX:** background revalidation stays **silent**: no top-of-list refresh skeleton while cached rows stay visible (stale L0 + first-page network, or warmup `retrySourceIds`), no sidebar “warming” copy, no enter animation on warmup-merged rows. React **`key`** on rows uses **`getNewsFeedItemListKey`**, not array index, to limit unnecessary reordering. Successful silent merge updates L0 when the URL has **no** facet (`shouldPersistNewsOverviewL0`).

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
- **Target (see Caching → Target semantics):** when serving **last-good cache** after a failed refresh, **reduce** client-visible `errors[]` noise; reserve detailed failures for **logs**.
- Invalid `category` / `region` / numeric params → `400` with a short message.
- Empty `items` is valid if all fetches fail or feeds parse to zero entries (**target:** distinguish **cold start + total failure** vs **prune removed all rows** where helpful).

---

## Caching (server)

Aligned with [.ai/knowledge/glossary.md](../../knowledge/glossary.md) **L1 / L2** flow for `GET /api/news/feed`.

### Current implementation (as of repo)

- **Merged pool only** — L1/L2 store the **full merged + deduped pool** for one **stable key**: resolved `RSSHUB_BASE_URL`, manifest **`category`** string (`''` for the all-category pool), **`subcategory`** string (`''` for the all-category pool; else the normalized **flat list slug** — from `list=` or from legacy `category`+`sub`), **`region`**, **`maxFeeds`**, and **`recentWindowHours`** (from the list slug / env). The key does **not** include `feedAnchor`, RSS list facets (`feedCategory` / `feedKeyword` / `feedSourceId`), `limit`, or `offset`.
- **Per request** — After a hit, `pruneNewsFeedPoolPayloadForWindow` applies the same rolling window length relative to `feedAnchor` (or `now`). Then `sliceNewsFeedPageFromPool` applies optional RSS facet filter + `offset`/`limit` in memory. Switching sidebar tags reuses the same pool → fast.
- **L1** — In-memory LRU (fewer entries than small payloads; pools are larger). **L2** — Upstash when configured. **Write-through on pool miss:** L2 then L1.
- **Pool L2 TTL** — `NEWS_FEED_KV_TTL_SECONDS` (default **86400**, clamp **3600–86400**), **one global value** for all pool keys (not yet aligned per list slug with `recentWindowHours`).
- **HTTP path** — `GET /api/news/feed` serves L1/L2 when present or runs a **synchronous** RSS merge on miss; **no** refresh attempt on hit. Stale pools update on the next miss, TTL expiry, or **external cron** (`GET /api/cron/sync/news-feed-pools`). Cron uses `reconcileNewsFeedPoolAfterRssFetch` (previous pool + fresh merge). Implementation: `services/news/feed/feed-kv-cache.ts`, `pruneNewsFeedPoolPayloadForWindow` / `reconcileNewsFeedPoolAfterRssFetch` / `reconcileNewsFeedPoolAfterFailedSourceRetry` in `feed/aggregate-feed.ts`.
- **Merge wall** — On cache miss, optional `NEWS_FEED_MERGE_WALL_MS` / Vercel default caps merge duration so a **partial** pool may be returned; see `.env.example` and `mergeNewsFeedsToPool` options.

### Target semantics (specification — implementation pending)

The following is the **agreed product/ops model** for pool caching and refresh. Code will be updated to match; until then, rely on **Current implementation** above.

**1. Three time dimensions (do not conflate them)**

| Dimension                                                                                               | Role                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content window** (`recentWindowHours` per list slug or `NEWS_FEED_RECENT_HOURS` for the no-list pool) | Decides whether an **item** may appear in the response: `publishedAt` relative to the request anchor (`feedAnchor` or `now`) must fall inside the window. The window can be wide (e.g. 72h / 7d); practical cardinality is still bounded by RSS depth and merge.                                                                                                                            |
| **Refresh interval (“re-fetch”)**                                                                       | How often the service **attempts** a new upstream RSS merge for that pool (e.g. **~10 minutes**). This is **freshness**, independent of how wide the content window is.                                                                                                                                                                                                                     |
| **Cache retention (L1/L2 TTL)**                                                                         | How long the **stored merged pool document** may be kept before treating it as absent for **cold-start** purposes. **Target:** align **per pool** with that pool’s **content window** (same order of magnitude, clamped to platform limits), so storage horizon matches display horizon. **Global** `NEWS_FEED_KV_TTL_SECONDS` may remain a ceiling or default until per-slug TTL is wired. |

**2. Stale-on-failure (serve last good pool)**

- If a refresh **fails** (network, RSSHub, timeout, total merge failure, etc.), **do not delete or overwrite** the last successfully stored pool for that key.
- **Return** the **previous** cached payload (after the usual per-request `pruneNewsFeedPoolPayloadForWindow` + slice). This is **valid and correct** whenever there is still a usable cached pool.

**3. When the response may be empty or an error**

- **Only** when there is **no** stored pool at all for that key **and** the current merge attempt **also** fails (cold start + failure). Then the API may return an **empty `items`** list and/or an **error response** — either is acceptable; pick one convention for the product.
- **Not** the same case: cache exists but **every item** falls outside the content window after prune → returning **zero items** is still a **successful** shape (no upstream “total failure” requirement).

**4. Successful refresh (reconcile, not blind replace on top of good cache)**

- When refresh **succeeds**, **merge** the new fetch with the **previous** pool (dedupe, sort, apply window), same idea as `reconcileNewsFeedPoolAfterRssFetch` today on cron — **do not** drop still-valid cached rows solely because a new request ran; rows disappear when the **content window** excludes them (or when dedupe replaces with a newer representation).

**5. Client-visible `errors[]` and partial merges**

- When the response is **served from last-good cache** after a failed refresh, **avoid** flooding the client with **per-source error noise**; prefer **server-side logs** and/or a **single** lightweight signal (e.g. `stale: true`, or a summarized `refreshError`).
- When **some** sources fail but the merged pool still has items, keep partial errors **optional** or **reduced** for UX; full diagnostics remain available in **structured server logs**.
- **`X-News-Pool-Partial: 1`** (merge wall / budget skip on miss) remains a separate, explicit indicator for debugging.

**6. Delivery constraints**

- **Refresh** on a short interval must not rely solely on **synchronous** work inside the default serverless budget; prefer **cron** (`/api/cron/sync/news-feed-pools`), **background** execution where the platform allows, or **try refresh with short timeout** then fall back to stale without writing failure state over the good pool.

**7. Client L0 (IndexedDB) — same scheme as L1/L2**

Terms follow [.ai/knowledge/glossary.md](../../knowledge/glossary.md): **L0** = browser IndexedDB; **L1** = server memory; **L2** = server KV (Upstash for this module). End-to-end flow: **L0 → (HTTP) → L1 → L2 → RSS upstream**.

- **Fast UX:** Show the last **good** L0 snapshot immediately for the **first page** (`offset=0`) while a network refresh runs (today: TTL **300s** `NEWS_FEED_OVERVIEW_IDB_TTL_MS`, aligned with API `stale-while-revalidate=300`).
- **Stale-on-failure:** If the API call **fails** (network, 5xx, timeout), **do not wipe** the L0 entry for that key; keep displaying the previous successful snapshot until **L0 TTL** expires or the user explicitly refreshes. Mirrors server “keep last good pool.”
- **Anti-thrash:** Revalidate on a **bounded** cadence (SWR + TTL today); when server-side refresh targets **~10 minutes**, the client should **debounce** or **rate-limit** background refetches so switching tabs / remounts do not **storm** `/api/news/feed`.
- **Write discipline:** **Overwrite** L0 only on **successful** API responses (`code === 0` or equivalent); failed attempts **must not** replace a still-valid L0 payload.

**8. Tag / keyword / source facet — must be part of the cache model**

- **Server:** The merged pool **L1/L2 cache key** intentionally **excludes** `feedCategory`, `feedKeyword`, and `feedSourceId`. One pool backs **all** facet views; filtering happens in memory (`sliceNewsFeedPageFromPool` after `pruneNewsFeedPoolPayloadForWindow`). **Stale-on-failure** therefore applies to the **shared pool**; a keyword-only API request still reads the same pool key as the unfiltered list, then applies the **keyword** filter. Product copy: “search by keyword” in the UI maps to query **`feedKeyword`** (Topics chip).
- **Client L0:** `buildNewsFeedOverviewIdbKey(listSlug)` — **no** facet dimension in the key (same merged pool per list as the server). The client reads **fresh TTL** then **stale** (`getNewsFeedOverviewFromIdbStale`) for SWR paint, filters cached rows to match URL `tag` / `keyword` / `source`, and **writes** L0 only on successful **unfiltered** first-page responses (`tagFilter === null`) so facet-specific slices never overwrite the shared row. All L0 rows follow §7.
- **Cold start:** If there is **no** server pool **and** no L0 entry **and** the request fails, the UI gets empty/error (same rule as §3).

---

## Semantics (latest only)

- Each response aims for **useful latest** data: **subject to** the target caching rules above, a response may be **intentionally stale** (last good pool) when refresh fails; optional response fields may indicate staleness once implemented.
- **Current** behavior: see **Caching (server) → Current implementation**; until reconcile-on-HTTP and stale-on-failure land, treat responses as **snapshot at last hit or miss** within TTL/cron.
- Any future “as of date” or archived snapshots must use a **separate path** and spec.

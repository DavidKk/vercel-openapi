/**
 * Phase-1 news categories (orthogonal to region). See TODO.md / modules/news.md.
 */
export type NewsCategory = 'general-news' | 'tech-internet' | 'game-entertainment' | 'science-academic'

/**
 * Supported regions for RSS sources in phase 1. `intl` is non-CN wire / English or global outlets (BBC world, Nature, etc.).
 */
export type NewsRegion = 'cn' | 'hk_tw' | 'intl'

/**
 * One row from `services/news/config/news-sources.manifest.ts` (`newsSourcesManifest.sources`)
 */
export interface NewsSourceConfig {
  /** Stable id for logs and API */
  id: string
  /** Human-readable label */
  label: string
  category: NewsCategory
  /**
   * List slug aligned with `/news/[slug]` and `GET /api/news/feed?list=` (see `news-subcategories.ts`); legacy API still accepts `category` + `sub`.
   */
  subcategory: string
  region: NewsRegion
  /** Path appended to RSSHUB_BASE_URL (e.g. /thepaper/featured) */
  rsshubPath: string
  /**
   * Default site URL when the RSS item has no usable http(s) link (e.g. tag deep-links to the outlet homepage).
   */
  defaultUrl?: string
}

/**
 * Root shape of `newsSourcesManifest` in `services/news/config/news-sources.manifest.ts`
 */
export interface NewsSourcesManifest {
  version: number
  sources: NewsSourceConfig[]
}

/**
 * Parsed RSS item before merge/dedupe
 */
export interface ParsedFeedItem {
  title: string
  link: string
  publishedAt: string | null
  summary: string | null
  /**
   * Cover image from `media:thumbnail`, `media:content` (image), RSS `enclosure` (image), or first absolute `img src` in `description` / `content:encoded`.
   */
  imageUrl?: string
  /**
   * RSS/Atom-style categories from `category`, `dc:subject`, etc. (order preserved, deduped).
   */
  feedCategories?: string[]
  /**
   * Keywords from `media:keywords`, `keywords`, split on common delimiters.
   */
  feedKeywords?: string[]
}

/**
 * Source attribution for items that share the same normalized link (cross-feed duplicates).
 */
export interface NewsItemSourceRef {
  /** Source id from the manifest */
  sourceId: string
  /** Human-readable label */
  sourceLabel: string
  /** Resolved open URL: RSS article link when valid, else manifest `defaultUrl` */
  href: string
}

/**
 * One clickable outlet row for multi-source cards (primary first, then merged feeds).
 */
export interface NewsPlatformTag {
  /** Source id from the manifest */
  sourceId: string
  /** Human-readable label shown on the tag */
  sourceLabel: string
  /** URL to open (article or default homepage); may be empty if manifest has no fallback */
  href: string
}

/**
 * Item returned from the aggregated feed API
 */
export interface AggregatedNewsItem extends ParsedFeedItem {
  sourceId: string
  sourceLabel: string
  /** Module taxonomy (manifest), not RSS `category` */
  category: NewsCategory
  region: NewsRegion
  /**
   * Other feeds that carried the same story: same normalized URL, or same calendar day + identical normalized title (different URLs).
   * Omitted when there are no extra sources; `sourceId` / `sourceLabel` stay the first-seen row.
   */
  alsoFromSources?: NewsItemSourceRef[]
  /**
   * When multiple outlets reported the same story: ordered tags (primary first, then `alsoFromSources`) with resolved `href` for UI links.
   */
  platformTags?: NewsPlatformTag[]
}

/**
 * Merge/dedupe diagnostics for logs and API clients (GET /api/news/feed).
 */
export interface NewsFeedMergeStats {
  /** RSS sources selected for this request (after region filter and maxFeeds slice; not filtered by article category) */
  sourcesRequested: number
  /** Sources that returned at least one parsed row (fetch OK and non-empty parse) */
  sourcesWithItems: number
  /** Sources that failed fetch or returned no items */
  sourcesEmptyOrFailed: number
  /** Raw rows appended from all feeds before dedupe */
  rawItemCount: number
  /** Rows skipped: normalized link empty */
  droppedMissingLink: number
  /** Rows skipped: same normalized URL already kept (duplicate across feeds) */
  duplicateDropped: number
  /** Rows merged: same UTC calendar day + identical normalized title, different URL and different source */
  duplicateDroppedByTitle: number
  /** Rows removed: `publishedAt` older than the rolling window (missing or unparseable `publishedAt` is kept) */
  droppedOutsideRecentWindow: number
  /** Rolling window length in hours (per-list defaults + `NEWS_FEED_RECENT_HOURS` for the all-pool / unknown slug) */
  recentWindowHours: number
  /**
   * Distinct items in the paginated list: after dedupe, recent window, optional manifest `category`,
   * and optional facet filter (`feedCategory` / `feedKeyword` / `feedSourceId`), before offset/limit slice.
   */
  uniqueAfterDedupe: number
  /** Skip applied before this page (`offset` query / MCP arg) */
  offset: number
  /** Whether more items exist after this page (`offset + returnedItems < uniqueAfterDedupe`) */
  hasMore: boolean
  /** Rows in this response (current page size) */
  returnedItems: number
  /** Items not included in this response after `offset` (same window + later pages) */
  truncatedByLimit: number
}

/** One RSS-derived category or keyword label with occurrence count in the merged pool */
export interface NewsFeedFacetLabel {
  value: string
  count: number
}

/** One outlet/source facet with occurrence count in the merged pool */
export interface NewsFeedFacetSource {
  sourceId: string
  label: string
  count: number
}

/**
 * Per configured RSS source: rows parsed from XML vs rows credited in the merged pool (after dedupe + time window).
 * Lets UIs explain “RSS OK but 0 in list” when items drop out of the rolling window or fold under another outlet.
 */
export interface NewsFeedSourceInventoryRow {
  sourceId: string
  label: string
  /** Item rows appended from this feed before cross-source dedupe */
  parsedCount: number
  /** Count in the merged pool (primary + co-source attribution), same basis as {@link NewsFeedFacetSource.count} */
  poolCount: number
}

/**
 * Facet histograms over the full merged pool for the current request (before `offset`/`limit` slice).
 * Used for filter UIs without scanning only the current page of items.
 */
export interface NewsFeedFacets {
  categories: NewsFeedFacetLabel[]
  keywords: NewsFeedFacetLabel[]
  sources: NewsFeedFacetSource[]
}

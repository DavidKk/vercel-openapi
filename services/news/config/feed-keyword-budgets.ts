/**
 * Central caps for RSS keywords → per-item chips → pool facet histogram size.
 * Keeps API payloads and UI facet lists bounded when sources emit huge keyword blobs.
 */

/** Max tokens kept from `media:keywords` / `keywords` per RSS item after split + dedupe (order preserved). */
export const MAX_RSS_KEYWORDS_PER_ITEM = 24

/** Max keyword labels on one aggregated item after strip/dedupe/merge (order preserved). */
export const MAX_ITEM_FEED_KEYWORDS = 24

/** Max rows in `buildFeedFacetsFromPool` keyword facet list (already sorted by count desc). */
export const MAX_POOL_KEYWORD_FACETS = 120

/**
 * Truncate a deduped keyword list for storage and facet aggregation.
 * @param keywords Labels in priority order
 * @returns Same list or first {@link MAX_ITEM_FEED_KEYWORDS} entries
 */
export function capItemFeedKeywordList(keywords: string[]): string[] {
  if (keywords.length <= MAX_ITEM_FEED_KEYWORDS) {
    return keywords
  }
  return keywords.slice(0, MAX_ITEM_FEED_KEYWORDS)
}

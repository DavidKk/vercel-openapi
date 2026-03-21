import type { AggregatedNewsItem } from './types'

/**
 * Sidebar / API list filter: RSS-derived category, keyword, or manifest source id.
 */
export type NewsFacetListFilter = { kind: 'fc'; value: string } | { kind: 'fk'; value: string } | { kind: 'src'; sourceId: string }

/**
 * Whether the item is attributed to the given manifest source (primary, merged, or platform tag).
 * @param item Aggregated row
 * @param sourceId Manifest source id
 * @returns True if this outlet appears on the item
 */
function itemHasSourceId(item: AggregatedNewsItem, sourceId: string): boolean {
  if (item.sourceId === sourceId) {
    return true
  }
  if (item.alsoFromSources?.some((s) => s.sourceId === sourceId)) {
    return true
  }
  if (item.platformTags?.some((t) => t.sourceId === sourceId)) {
    return true
  }
  return false
}

/**
 * Whether a row matches the facet list filter (same rules as `/api/news/feed` list filtering).
 * @param item Feed row
 * @param filter Non-null facet filter
 * @returns True if the row should appear in the filtered list
 */
export function itemMatchesFacetListFilter(item: AggregatedNewsItem, filter: NewsFacetListFilter): boolean {
  if (filter.kind === 'fc') {
    return item.feedCategories?.includes(filter.value) ?? false
  }
  if (filter.kind === 'fk') {
    return item.feedKeywords?.includes(filter.value) ?? false
  }
  return itemHasSourceId(item, filter.sourceId)
}

/**
 * Keep rows that match the facet filter; used after full merge pool is built, before pagination.
 * @param pool Merged pool (deduped, sorted, recent window, optional manifest category)
 * @param filter Facet filter
 * @returns Subset of `pool` in stable order
 */
export function filterPoolByFacetList(pool: AggregatedNewsItem[], filter: NewsFacetListFilter): AggregatedNewsItem[] {
  return pool.filter((row) => itemMatchesFacetListFilter(row, filter))
}

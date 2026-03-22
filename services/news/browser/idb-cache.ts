/**
 * Browser-only IndexedDB cache for the News overview first page (`GET /api/news/feed` with `offset=0`).
 * TTL matches `GET /api/news/feed` `Cache-Control` `stale-while-revalidate=300` (5 minutes of acceptable staleness).
 * Do not import from API routes or server code (uses `window`).
 */

import { createIdbCache, IDB_STORES, SHARED_DB_NAME } from '@/services/idb-cache'
import { normalizeNewsListSlug } from '@/services/news/config/news-subcategories'
import type { NewsFacetListFilter } from '@/services/news/facets/facet-list-filter'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/**
 * Client TTL for cached overview rows (ms). Kept in sync with API `stale-while-revalidate=300`.
 */
export const NEWS_FEED_OVERVIEW_IDB_TTL_MS = 300 * 1000

const overviewCache = createIdbCache<NewsFeedOverviewCachePayload>(SHARED_DB_NAME, IDB_STORES.NEWS_FEED, NEWS_FEED_OVERVIEW_IDB_TTL_MS)

/**
 * Serializable first-page feed snapshot for the overview UI.
 */
export interface NewsFeedOverviewCachePayload {
  items: AggregatedNewsItem[]
  errors: { sourceId: string; message: string }[]
  fetchedAt?: string
  facets: NewsFeedFacets | null
  sourceInventory: NewsFeedSourceInventoryRow[] | null
  uniqueAfterDedupe: number | null
  hasMore: boolean
}

/**
 * Stable IndexedDB key for one overview session (list + page size + at most one facet).
 * @param listSlug Flat list slug (e.g. headlines)
 * @param pageSize `limit` query sent to `/api/news/feed`
 * @param facet Optional RSS facet filter (same dimensions as URL `tag` / `keyword` / `source`)
 * @returns Cache key string
 */
export function buildNewsFeedOverviewIdbKey(listSlug: string, pageSize: number, facet: NewsFacetListFilter | null): string {
  const list = normalizeNewsListSlug(listSlug)
  let facetSeg = 'none'
  if (facet?.kind === 'fc') {
    facetSeg = `fc:${facet.value}`
  } else if (facet?.kind === 'fk') {
    facetSeg = `fk:${facet.value}`
  } else if (facet?.kind === 'src') {
    facetSeg = `src:${facet.sourceId}`
  }
  return `v1:overview:${list}:ps${pageSize}:${facetSeg}`
}

/**
 * Whether `value` is a usable cached overview payload.
 * @param value Unknown value from IndexedDB
 * @returns True when shape is safe to hydrate the UI
 */
export function isNewsFeedOverviewCachePayload(value: unknown): value is NewsFeedOverviewCachePayload {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const v = value as Record<string, unknown>
  return Array.isArray(v.items) && typeof v.hasMore === 'boolean' && Array.isArray(v.errors)
}

/**
 * Read a non-expired first-page snapshot from IndexedDB.
 * @param key Key from {@link buildNewsFeedOverviewIdbKey}
 * @returns Payload or null on miss / invalid shape / SSR
 */
export async function getNewsFeedOverviewFromIdb(key: string): Promise<NewsFeedOverviewCachePayload | null> {
  const raw = await overviewCache.get(key)
  if (raw === null || !isNewsFeedOverviewCachePayload(raw)) {
    return null
  }
  return raw
}

/**
 * Persist a successful first-page snapshot (call only for `code === 0` or omitted `code`).
 * @param key Key from {@link buildNewsFeedOverviewIdbKey}
 * @param payload Data to store
 */
export async function setNewsFeedOverviewInIdb(key: string, payload: NewsFeedOverviewCachePayload): Promise<void> {
  await overviewCache.set(key, payload)
}

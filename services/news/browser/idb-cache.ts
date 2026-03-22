/**
 * Browser-only IndexedDB cache for the News overview first page (`GET /api/news/feed` with `offset=0`).
 * Do not import from API routes or server code (uses `window`).
 */

import { createIdbCache, IDB_STORES, openSharedDb, SHARED_DB_NAME } from '@/services/idb-cache'
import { normalizeNewsListSlug } from '@/services/news/config/news-subcategories'
import type { NewsFacetListFilter } from '@/services/news/facets/facet-list-filter'
import { filterPoolByFacetList } from '@/services/news/facets/facet-list-filter'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/**
 * Client TTL for cached overview rows (ms). Within this window, the overview uses IndexedDB directly and skips the
 * first-page network refresh on reload so repeated refreshes stay local for 10 minutes.
 */
export const NEWS_FEED_OVERVIEW_IDB_TTL_MS = 600 * 1000

const overviewCache = createIdbCache<NewsFeedOverviewCachePayload>(SHARED_DB_NAME, IDB_STORES.NEWS_FEED, NEWS_FEED_OVERVIEW_IDB_TTL_MS)

/**
 * Serializable first-page feed snapshot for the overview UI.
 */
export interface NewsFeedOverviewCachePayload {
  items: AggregatedNewsItem[]
  errors: { sourceId: string; message: string }[]
  warmupSources?: { sourceId: string; message: string }[]
  fetchedAt?: string
  facets: NewsFeedFacets | null
  sourceInventory: NewsFeedSourceInventoryRow[] | null
  uniqueAfterDedupe: number | null
  hasMore: boolean
  /** True when the last successful page still reported warmup-pending sources; keep rows, but do not treat the cache as fresh. */
  warmupPending?: boolean
}

/**
 * Whether `value` is a valid cached warmup source row.
 * @param value Unknown element from IndexedDB
 * @returns True when `{ sourceId, message }` strings are present
 */
function isNewsFeedOverviewWarmupSource(value: unknown): value is { sourceId: string; message: string } {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const v = value as Record<string, unknown>
  return typeof v.sourceId === 'string' && typeof v.message === 'string'
}

/**
 * IndexedDB key for the news overview **per flat list only** (one L0 row per channel). The snapshot is always
 * the **unfiltered** first API page for that list (`limit` matches app `PAGE_SIZE`); tag / keyword / source facets
 * are applied in the client via {@link applyFacetFilterToCachedOverviewItems}.
 * @param listSlug Flat list slug (e.g. headlines, games)
 * @returns Key string, e.g. `v1:overview:headlines`
 */
export function buildNewsFeedOverviewIdbKey(listSlug: string): string {
  const list = normalizeNewsListSlug(listSlug)
  return `v1:overview:${list}`
}

/**
 * L0 stores the unfiltered merged-pool first page; narrow it to the current URL facet using the same rules as the API slice.
 * @param items Rows from {@link NewsFeedOverviewCachePayload.items} (unfiltered page)
 * @param facet Active facet from the overview URL, or null for the full page
 * @returns Rows to show before the network response arrives
 */
export function applyFacetFilterToCachedOverviewItems(items: AggregatedNewsItem[], facet: NewsFacetListFilter | null): AggregatedNewsItem[] {
  if (facet === null) {
    return items
  }
  return filterPoolByFacetList(items, facet)
}

/**
 * `hasMore` on the cached payload refers to the **unfiltered** paginated slice. After a client-only facet filter,
 * whether more filtered rows exist cannot be inferred from one page — assume true until `GET /api/news/feed` updates.
 * @param cachedHasMore `hasMore` from the stored snapshot
 * @param facet Active URL facet, or null
 * @returns Value safe to pass to `setHasMore` after IDB hydration
 */
export function cachedOverviewHasMoreHint(cachedHasMore: boolean, facet: NewsFacetListFilter | null): boolean {
  return facet === null ? cachedHasMore : true
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
  return (
    Array.isArray(v.items) &&
    typeof v.hasMore === 'boolean' &&
    Array.isArray(v.errors) &&
    (v.warmupSources === undefined || (Array.isArray(v.warmupSources) && v.warmupSources.every(isNewsFeedOverviewWarmupSource)))
  )
}

/**
 * Read cached warmup sources safely for UI hydration.
 * @param payload Valid overview cache payload
 * @returns Warmup source list or an empty array
 */
export function getNewsFeedOverviewCachedWarmupSources(payload: NewsFeedOverviewCachePayload): { sourceId: string; message: string }[] {
  return payload.warmupSources ?? []
}

/**
 * Fresh L0 is bypassed when the cached first page still reported warmup-pending sources; rows remain useful for paint,
 * but the client must keep requesting the API to fill those missing sources.
 * @param payload Valid cache payload from IndexedDB
 * @returns True when the first-page network refresh should still run
 */
export function shouldBypassFreshNewsFeedOverviewCache(payload: NewsFeedOverviewCachePayload): boolean {
  return payload.warmupPending === true || (payload.warmupSources?.length ?? 0) > 0
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
  if (shouldBypassFreshNewsFeedOverviewCache(raw)) {
    return null
  }
  return raw
}

/**
 * Read the same snapshot as {@link getNewsFeedOverviewFromIdb} but **ignore** {@link NEWS_FEED_OVERVIEW_IDB_TTL_MS}
 * (stale-while-revalidate: show last successful payload while the network refresh runs).
 * @param key Key from {@link buildNewsFeedOverviewIdbKey}
 * @returns Payload or null on miss / invalid shape / SSR
 */
export async function getNewsFeedOverviewFromIdbStale(key: string): Promise<NewsFeedOverviewCachePayload | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null
  }
  const storeName = IDB_STORES.NEWS_FEED
  let db: IDBDatabase
  try {
    db = await openSharedDb(storeName)
  } catch {
    return null
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const req = store.get(key)
      req.onsuccess = () => {
        db.close()
        const row = req.result as { key: string; data: unknown; storedAt?: number } | undefined
        if (row?.data == null || !isNewsFeedOverviewCachePayload(row.data)) {
          resolve(null)
          return
        }
        resolve(row.data)
      }
      req.onerror = () => {
        db.close()
        resolve(null)
      }
    } catch {
      db.close()
      resolve(null)
    }
  })
}

/**
 * Persist a successful first-page snapshot (call only for `code === 0` or omitted `code`).
 * @param key Key from {@link buildNewsFeedOverviewIdbKey}
 * @param payload Data to store
 */
export async function setNewsFeedOverviewInIdb(key: string, payload: NewsFeedOverviewCachePayload): Promise<void> {
  await overviewCache.set(key, payload)
}

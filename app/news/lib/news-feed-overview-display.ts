import { applyFacetFilterToCachedOverviewItems, cachedOverviewHasMoreHint, type NewsFeedOverviewCachePayload } from '@/services/news/browser/idb-cache'
import type { NewsFacetListFilter } from '@/services/news/facets/facet-list-filter'
import { newsOverviewTagFiltersEqual } from '@/services/news/routing/news-overview-url'

/**
 * View-model slice after reading L0 (fresh or stale): filtered rows, pagination hint, and whether to keep `loading` until the network response.
 * @param cached Snapshot from IndexedDB for this list slug (unfiltered first page)
 * @param facet Current URL facet, or null for the full channel page
 * @returns `displayItems` / `hasMore` for state; `needsLoadingUntilNetwork` means keep `loading` true until the network response applies.
 */
export function getNewsOverviewL0HydrationView(
  cached: NewsFeedOverviewCachePayload,
  facet: NewsFacetListFilter | null
): {
  displayItems: NewsFeedOverviewCachePayload['items']
  hasMore: boolean
  needsLoadingUntilNetwork: boolean
} {
  const displayItems = applyFacetFilterToCachedOverviewItems(cached.items, facet)
  return {
    displayItems,
    hasMore: cachedOverviewHasMoreHint(cached.hasMore, facet),
    needsLoadingUntilNetwork: displayItems.length === 0,
  }
}

/**
 * Whether the overview article column should show the full-page skeleton (vs list / empty / error).
 * @param loading Network-first-page request still in flight (or empty L0 page waiting on network)
 * @param feedSessionBootstrap IDB read for this list/facet session not finished yet
 * @param itemCount Current `items.length`
 * @returns True when the six-card pulse skeleton should render
 */
export function getNewsOverviewMainFeedSkeleton(loading: boolean, feedSessionBootstrap: boolean, itemCount: number): boolean {
  return loading || (feedSessionBootstrap && itemCount === 0)
}

/**
 * Whether the article list should show the small head refresh skeleton while cached rows stay visible.
 * Warmup `retrySourceIds` refetches are silent (no skeleton).
 * @param loading First-page request state
 * @param initialRequestSettled True after the current session's first network request settles
 * @param itemCount Current `items.length`
 * @returns True when the top-of-list refresh skeleton should render
 */
export function getNewsOverviewHeadRefreshVisible(loading: boolean, initialRequestSettled: boolean, itemCount: number): boolean {
  return !loading && !initialRequestSettled && itemCount > 0
}

/**
 * Whether the “No articles yet” empty state should show (not skeleton, not error string).
 * @param mainFeedSkeleton Result of {@link getNewsOverviewMainFeedSkeleton}
 * @param itemCount Current `items.length`
 * @param error Non-null when a blocking error message is set
 * @returns True when {@link EmptyState} should render
 */
export function getNewsOverviewEmptyStateVisible(mainFeedSkeleton: boolean, itemCount: number, error: string | null): boolean {
  return !mainFeedSkeleton && itemCount === 0 && error === null
}

/**
 * Whether the red inline error banner should show above the feed column.
 * @param error Non-null error message
 * @param loading Same as component `loading`
 * @param feedSessionBootstrap Same as component `feedSessionBootstrap`
 * @param itemCount Current `items.length`
 * @returns True when the error div should render
 */
export function getNewsOverviewErrorBannerVisible(error: string | null, loading: boolean, feedSessionBootstrap: boolean, itemCount: number): boolean {
  return error !== null && !loading && !feedSessionBootstrap && itemCount === 0
}

/**
 * One async request session for the overview list. The token changes whenever the component starts a new
 * first-page session for the same slug/facet so stale promises cannot update the next session.
 */
export interface NewsOverviewSessionSnapshot {
  token: number
  listSlug: string
  facet: NewsFacetListFilter | null
}

/**
 * Whether an async result still belongs to the current overview session.
 * @param current Latest active session snapshot from refs/state
 * @param incoming Session captured when the async work started
 * @returns True when the result may update the UI
 */
export function isSameNewsOverviewSession(current: NewsOverviewSessionSnapshot, incoming: NewsOverviewSessionSnapshot): boolean {
  return current.token === incoming.token && current.listSlug === incoming.listSlug && newsOverviewTagFiltersEqual(current.facet, incoming.facet)
}

/**
 * Whether infinite-scroll may request the next page for the current overview session.
 * @param loading First-page request state
 * @param loadingMore Next-page request state
 * @param hasMore Current pagination hint
 * @param initialRequestSettled True after the current session's first network request settles
 * @param itemCount Current rendered rows
 * @returns True when `load more` may run
 */
export function getNewsOverviewLoadMoreEnabled(loading: boolean, loadingMore: boolean, hasMore: boolean, initialRequestSettled: boolean, itemCount: number): boolean {
  return !loading && !loadingMore && hasMore && initialRequestSettled && itemCount > 0
}

/**
 * L0 is one row per list slug with an **unfiltered** first page only; facet-specific API responses must not overwrite it.
 * @param facet Current URL facet, or null
 * @param envelopeCode JSON envelope `code` from `/api/news/feed` (omit or `0` = success)
 * @returns True when the client may call `setNewsFeedOverviewInIdb`
 */
export function shouldPersistNewsOverviewL0(facet: NewsFacetListFilter | null, envelopeCode: number | undefined): boolean {
  return facet === null && (envelopeCode === undefined || envelopeCode === 0)
}

/**
 * When the overview effect bails out after starting `fetchFeedPage` with an {@link AbortSignal}, the aborted `fetch` rejects;
 * this attaches a handler so the rejection is never unhandled.
 * @param p The promise returned by the overview initial `fetchFeedPage` call
 * @returns A promise that settles to `undefined` even when `p` rejects (e.g. abort)
 */
export function drainAbortedOverviewFetch(p: Promise<unknown>): Promise<void> {
  return p.then(
    () => undefined,
    () => undefined
  )
}

import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchNewsOverviewFeedPage, type NewsOverviewFetchFeedPageOptions } from '@/app/news/lib/fetch-news-overview-feed-page'
import { getNewsFeedItemRowKeys, mergeNewsFeedItemsPreferIncomingHead } from '@/app/news/lib/news-feed-item-key'
import {
  drainAbortedOverviewFetch,
  getNewsOverviewL0HydrationView,
  getNewsOverviewLoadMoreEnabled,
  isSameNewsOverviewSession,
  type NewsOverviewSessionSnapshot,
  shouldPersistNewsOverviewL0,
} from '@/app/news/lib/news-feed-overview-display'
import { logNewsOverview } from '@/app/news/lib/news-overview-client-log'
import {
  NEWS_OVERVIEW_BACK_TO_TOP_SCROLL_THRESHOLD_PX,
  newsOverviewFacetLabelForLog,
  newsOverviewMergePartialErrors,
  type NewsOverviewTagFilter,
} from '@/app/news/lib/news-overview-ui'
import {
  buildNewsFeedOverviewIdbKey,
  getNewsFeedOverviewCachedWarmupSources,
  getNewsFeedOverviewFromIdb,
  getNewsFeedOverviewFromIdbStale,
  setNewsFeedOverviewInIdb,
} from '@/services/news/browser/idb-cache'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/**
 * Feed session state, scroll refs, fetch orchestration, optional one-shot warmup refetch, and infinite scroll.
 * @param args Pathname, current list/facet, mirrored refs from {@link useNewsOverviewRouteFacets}, and search-param key for UI resets
 * @returns State, refs, and actions consumed by overview layout components
 */
export function useNewsOverviewFeedSession(args: {
  pathname: string
  listSlug: string
  tagFilter: NewsOverviewTagFilter
  listSlugRef: MutableRefObject<string>
  tagFilterRef: MutableRefObject<NewsOverviewTagFilter>
  searchParamsKey: string
}) {
  const { pathname, listSlug, tagFilter, listSlugRef, tagFilterRef, searchParamsKey } = args

  const [items, setItems] = useState<AggregatedNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  /**
   * True until IndexedDB (fresh or stale) has been consulted for the current list/facet session — avoids treating
   * an empty list as “no articles” while IDB is still loading, without forcing `loading` before we know if L0 can paint.
   */
  const [feedSessionBootstrap, setFeedSessionBootstrap] = useState(false)
  /** True after the current session's first network request settles; gates infinite scroll when L0 painted immediately. */
  const [initialFeedRequestSettled, setInitialFeedRequestSettled] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partialErrors, setPartialErrors] = useState<{ sourceId: string; message: string }[]>([])
  /** Transient RSS issues (timeouts / merge cap); overview issues one silent follow-up `retrySourceIds` request when non-empty. */
  const [warmupSources, setWarmupSources] = useState<{ sourceId: string; message: string }[]>([])
  /** Facet histograms from the API over the full merged pool (not derived from loaded pages). */
  const [feedFacets, setFeedFacets] = useState<NewsFeedFacets | null>(null)
  /** Per-source parsed vs pool counts from the API (explains 0 in list when RSS still returned rows). */
  const [sourceInventory, setSourceInventory] = useState<NewsFeedSourceInventoryRow[] | null>(null)
  /** Total rows in the merged pool for the current category session (`mergeStats.uniqueAfterDedupe`). */
  const [totalArticleCount, setTotalArticleCount] = useState<number | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  /** Row keys (see article list `key`) with expanded long summaries; reset when list or URL facets change. */
  const [expandedSummaryKeys, setExpandedSummaryKeys] = useState<Record<string, true>>({})
  /** List keys that should play the head insert animation. */
  const [enteringItemKeys, setEnteringItemKeys] = useState<ReadonlySet<string>>(() => new Set())
  /** Browser timer handle (`window.setTimeout`); typed as `number` for DOM + Node typings overlap. */
  const newsEnterClearTimeoutRef = useRef<number | null>(null)
  const scrollBackToTopRafRef = useRef<number | null>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<AggregatedNewsItem[]>([])
  const loadMoreRef = useRef<() => Promise<void>>(async () => {})
  const loadMoreAbortRef = useRef<AbortController | null>(null)
  /** Prevents overlapping load-more requests before `loadingMore` state updates. */
  const loadMoreInFlightRef = useRef(false)
  /**
   * Prevents overlapping warmup refetches if the effect re-runs while a request is still in flight.
   */
  const warmupRefetchInFlightRef = useRef(false)
  /**
   * First-page `data.fetchedAt` (ISO). Sent as `feedAnchor` on load-more so the server uses the same
   * rolling time window and stable merge order for `offset` slices.
   */
  const feedSessionAnchorRef = useRef<string | null>(null)
  /** Latest `warmupSources` for the one-shot `retrySourceIds` request (ids only). */
  const warmupSourcesRef = useRef<{ sourceId: string; message: string }[]>([])
  /** Monotonic token for the current first-page session; stale async results must match this token before mutating state. */
  const feedSessionTokenRef = useRef(0)
  /** Mirrors `initialFeedRequestSettled` for async guards without waiting for React state to flush. */
  const initialFeedRequestSettledRef = useRef(false)
  itemsRef.current = items
  warmupSourcesRef.current = warmupSources

  useEffect(() => {
    return () => {
      loadMoreAbortRef.current?.abort()
      loadMoreAbortRef.current = null
      if (scrollBackToTopRafRef.current !== null) {
        window.cancelAnimationFrame(scrollBackToTopRafRef.current)
        scrollBackToTopRafRef.current = null
      }
      if (newsEnterClearTimeoutRef.current !== null) {
        clearTimeout(newsEnterClearTimeoutRef.current)
        newsEnterClearTimeoutRef.current = null
      }
    }
  }, [])

  const scheduleNewsEnterAnimationClear = useCallback(() => {
    if (newsEnterClearTimeoutRef.current !== null) {
      clearTimeout(newsEnterClearTimeoutRef.current)
    }
    newsEnterClearTimeoutRef.current = window.setTimeout(() => {
      setEnteringItemKeys(new Set())
      newsEnterClearTimeoutRef.current = null
    }, 1800)
  }, [])

  /**
   * Keep state and ref aligned so async guards can check the latest first-page readiness synchronously.
   * @param next Whether the current session's first network request has settled
   */
  function setInitialFeedRequestSettledState(next: boolean): void {
    initialFeedRequestSettledRef.current = next
    setInitialFeedRequestSettled(next)
  }

  /**
   * Snapshot the currently active overview session from refs.
   * @returns Session identity used to accept or discard async results
   */
  function getActiveNewsOverviewSession(): NewsOverviewSessionSnapshot {
    return {
      token: feedSessionTokenRef.current,
      listSlug: listSlugRef.current,
      facet: tagFilterRef.current,
    }
  }

  /**
   * Whether an async result still belongs to the current list/facet session.
   * @param session Snapshot captured when the async work started
   * @returns True when the result may update the current UI
   */
  function isActiveNewsOverviewSession(session: NewsOverviewSessionSnapshot): boolean {
    return isSameNewsOverviewSession(getActiveNewsOverviewSession(), session)
  }

  /**
   * Apply first-page refresh from background warmup `retrySourceIds`: prepend unseen rows, keep tail order.
   * When `silent` is true, skip list enter animation and persist L0 (unfiltered list only) so the user does not perceive a refresh.
   * @param r Parsed first-page payload from the warmup request
   * @param silent Use true for background warmup merges (no enter animation, write IDB when facet is null)
   */
  const applyWarmupFirstPageMerge = useCallback(
    (
      r: {
        list: AggregatedNewsItem[]
        errors: { sourceId: string; message: string }[]
        feedWarmupSources: { sourceId: string; message: string }[]
        fetchedAt?: string
        facets?: NewsFeedFacets
        sourceInventory?: NewsFeedSourceInventoryRow[]
        uniqueAfterDedupe?: number
        hasMore?: boolean
      },
      silent: boolean
    ) => {
      const prev = itemsRef.current
      const { merged, prependedKeys } = mergeNewsFeedItemsPreferIncomingHead(prev, r.list)
      setItems(merged)
      if (silent) {
        if (newsEnterClearTimeoutRef.current !== null) {
          clearTimeout(newsEnterClearTimeoutRef.current)
          newsEnterClearTimeoutRef.current = null
        }
        setEnteringItemKeys(new Set())
      } else if (prependedKeys.length > 0) {
        setEnteringItemKeys(new Set(prependedKeys))
        scheduleNewsEnterAnimationClear()
      } else {
        if (newsEnterClearTimeoutRef.current !== null) {
          clearTimeout(newsEnterClearTimeoutRef.current)
          newsEnterClearTimeoutRef.current = null
        }
        setEnteringItemKeys(new Set())
      }
      setPartialErrors(r.errors)
      setWarmupSources(r.feedWarmupSources)
      if (r.fetchedAt) {
        feedSessionAnchorRef.current = r.fetchedAt
      }
      if (r.facets) {
        setFeedFacets(r.facets)
      } else {
        setFeedFacets(null)
      }
      if (r.sourceInventory !== undefined) {
        setSourceInventory(r.sourceInventory)
      }
      if (r.uniqueAfterDedupe !== undefined) {
        setTotalArticleCount(r.uniqueAfterDedupe)
      }
      if (r.hasMore !== undefined) {
        setHasMore(r.hasMore)
      }
      if (silent && shouldPersistNewsOverviewL0(tagFilterRef.current, 0)) {
        const idbKey = buildNewsFeedOverviewIdbKey(listSlugRef.current)
        void setNewsFeedOverviewInIdb(idbKey, {
          items: merged,
          errors: r.errors,
          warmupSources: r.feedWarmupSources,
          fetchedAt: r.fetchedAt,
          facets: r.facets ?? null,
          sourceInventory: r.sourceInventory ?? null,
          uniqueAfterDedupe: r.uniqueAfterDedupe ?? null,
          hasMore: r.hasMore ?? true,
          warmupPending: r.feedWarmupSources.length > 0,
        }).catch(() => undefined)
      }
    },
    [scheduleNewsEnterAnimationClear]
  )

  const warmupSourceIdsKey = useMemo(
    () =>
      warmupSources
        .map((s) => s.sourceId)
        .sort()
        .join(','),
    [warmupSources]
  )

  useEffect(() => {
    setExpandedSummaryKeys({})
  }, [listSlug, searchParamsKey])

  const fetchFeedPage = useCallback(
    (slug: string, offset: number, options?: NewsOverviewFetchFeedPageOptions) => fetchNewsOverviewFeedPage(pathname, slug, offset, options),
    [pathname]
  )

  /**
   * Background-only: one first-page request with `retrySourceIds` when the API reports warming sources.
   * No loading UI; server merges into L1/L2. Client merges into list + L0 when unfiltered; aborts on list/facet change.
   */
  useEffect(() => {
    if (warmupSourceIdsKey === '') {
      return
    }
    const ac = new AbortController()
    const slug = listSlug
    const run = async () => {
      if (ac.signal.aborted) {
        return
      }
      const ids = warmupSourcesRef.current.map((r) => r.sourceId)
      if (ids.length === 0) {
        return
      }
      if (warmupRefetchInFlightRef.current) {
        return
      }
      warmupRefetchInFlightRef.current = true
      const session: NewsOverviewSessionSnapshot = {
        token: feedSessionTokenRef.current,
        listSlug: slug,
        facet: tagFilterRef.current,
      }
      try {
        const r = await fetchFeedPage(slug, 0, {
          signal: ac.signal,
          listTagFilter: session.facet,
          requestIntent: 'warmup_refetch',
          retrySourceIds: ids,
        })
        if (ac.signal.aborted || !isActiveNewsOverviewSession(session)) {
          return
        }
        if (r.ok && (r.code === undefined || r.code === 0)) {
          applyWarmupFirstPageMerge(
            {
              list: r.list,
              errors: r.errors,
              feedWarmupSources: r.feedWarmupSources,
              fetchedAt: r.fetchedAt,
              facets: r.facets,
              sourceInventory: r.sourceInventory,
              uniqueAfterDedupe: r.uniqueAfterDedupe,
              hasMore: r.hasMore,
            },
            true
          )
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
      } finally {
        warmupRefetchInFlightRef.current = false
      }
    }
    void run()
    return () => {
      ac.abort()
      warmupRefetchInFlightRef.current = false
    }
  }, [listSlug, tagFilter, warmupSourceIdsKey, fetchFeedPage, applyWarmupFirstPageMerge])

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    const slug = listSlug
    listSlugRef.current = slug
    tagFilterRef.current = tagFilter
    const session: NewsOverviewSessionSnapshot = {
      token: feedSessionTokenRef.current + 1,
      listSlug: slug,
      facet: tagFilter,
    }
    feedSessionTokenRef.current = session.token

    const root = scrollRootRef.current
    if (root) {
      root.scrollTop = 0
    }
    setShowBackToTop(false)

    feedSessionAnchorRef.current = null
    setInitialFeedRequestSettledState(false)
    setFeedSessionBootstrap(true)
    setLoadingMore(false)
    loadMoreAbortRef.current?.abort()
    loadMoreAbortRef.current = null
    loadMoreInFlightRef.current = false
    setError(null)
    setPartialErrors([])
    setWarmupSources([])
    setEnteringItemKeys(new Set())
    if (newsEnterClearTimeoutRef.current !== null) {
      clearTimeout(newsEnterClearTimeoutRef.current)
      newsEnterClearTimeoutRef.current = null
    }
    setItems([])
    setFeedFacets(null)
    setSourceInventory(null)
    setTotalArticleCount(null)
    setHasMore(true)
    ;(async () => {
      logNewsOverview('feed_session_start', {
        pagePath: pathname,
        list: slug,
        facet: newsOverviewFacetLabelForLog(session.facet),
      })
      const idbKey = buildNewsFeedOverviewIdbKey(slug)
      /**
       * Defer network (and IDB) until after the current synchronous passive-effect flush. In React 18 Strict Mode
       * (dev), the first effect run is torn down immediately; without this yield, `fetchFeedPage` would already be
       * in flight and get aborted, wasting a server round-trip. A single microtask is enough for cleanup to run first.
       */
      await Promise.resolve()
      if (cancelled || !isActiveNewsOverviewSession(session)) {
        return
      }
      let hydratedFromIdb = false
      let cachedFresh: Awaited<ReturnType<typeof getNewsFeedOverviewFromIdb>> = null
      let cached: Awaited<ReturnType<typeof getNewsFeedOverviewFromIdb>> = null
      try {
        cachedFresh = await getNewsFeedOverviewFromIdb(idbKey)
        cached = cachedFresh ?? (await getNewsFeedOverviewFromIdbStale(idbKey))
      } catch {
        cachedFresh = null
        cached = null
      }

      if (!cancelled && isActiveNewsOverviewSession(session)) {
        setFeedSessionBootstrap(false)
        if (cached) {
          const l0View = getNewsOverviewL0HydrationView(cached, session.facet)
          setItems(l0View.displayItems)
          setHasMore(l0View.hasMore)
          setPartialErrors(cached.errors)
          setWarmupSources(getNewsFeedOverviewCachedWarmupSources(cached))
          if (cached.fetchedAt) {
            feedSessionAnchorRef.current = cached.fetchedAt
          }
          if (cached.facets) {
            setFeedFacets(cached.facets)
          } else {
            setFeedFacets(null)
          }
          setSourceInventory(cached.sourceInventory ?? null)
          setTotalArticleCount(cached.uniqueAfterDedupe ?? null)
          setError(null)
          hydratedFromIdb = true
          setLoading(l0View.needsLoadingUntilNetwork)
          logNewsOverview('feed_idb_hit', {
            pagePath: pathname,
            list: slug,
            facet: newsOverviewFacetLabelForLog(session.facet),
            idbKey,
            itemsCount: l0View.displayItems.length,
            idbPoolPageCount: cached.items.length,
            idbFresh: cachedFresh !== null,
          })
        } else {
          setLoading(true)
        }
      }

      if (cachedFresh !== null) {
        if (!cancelled && isActiveNewsOverviewSession(session)) {
          setLoading(false)
          setInitialFeedRequestSettledState(true)
          logNewsOverview('feed_idb_fresh_skip_network', {
            pagePath: pathname,
            list: slug,
            facet: newsOverviewFacetLabelForLog(session.facet),
            idbKey,
          })
        }
        return
      }

      /** Fresh L0 miss: continue with stale-on-failure behavior by requesting the first page from the network. */
      const fetchPromise = fetchFeedPage(slug, 0, {
        signal: ac.signal,
        listTagFilter: session.facet,
        requestIntent: 'initial',
      })

      if (cancelled || !isActiveNewsOverviewSession(session)) {
        drainAbortedOverviewFetch(fetchPromise)
        return
      }

      try {
        const result = await fetchPromise
        if (cancelled || !isActiveNewsOverviewSession(session)) {
          return
        }
        if (!result.ok) {
          if (!hydratedFromIdb) {
            setItems([])
            setFeedFacets(null)
            setSourceInventory(null)
            setTotalArticleCount(null)
            setError(result.text || `HTTP ${result.status}`)
            setHasMore(false)
            setWarmupSources([])
          } else {
            logNewsOverview('feed_kept_idb_after_api_error', {
              pagePath: pathname,
              list: slug,
              facet: newsOverviewFacetLabelForLog(session.facet),
              httpStatus: result.status,
            })
            setError(null)
            setPartialErrors([])
            setWarmupSources([])
            setLoading(false)
          }
          return
        }
        if (result.code !== undefined && result.code !== 0) {
          setError(result.message ?? 'Request failed')
        } else {
          setError(null)
        }
        setItems(result.list)
        setHasMore(result.hasMore)
        setPartialErrors(result.errors)
        setWarmupSources(result.feedWarmupSources)
        if (result.fetchedAt) {
          feedSessionAnchorRef.current = result.fetchedAt
        }
        if (result.facets) {
          setFeedFacets(result.facets)
        } else {
          setFeedFacets(null)
        }
        if (result.sourceInventory !== undefined) {
          setSourceInventory(result.sourceInventory)
        } else {
          setSourceInventory(null)
        }
        if (result.uniqueAfterDedupe !== undefined) {
          setTotalArticleCount(result.uniqueAfterDedupe)
        } else {
          setTotalArticleCount(null)
        }
        if (shouldPersistNewsOverviewL0(session.facet, result.code)) {
          try {
            await setNewsFeedOverviewInIdb(idbKey, {
              items: result.list,
              errors: result.errors,
              warmupSources: result.feedWarmupSources,
              fetchedAt: result.fetchedAt,
              facets: result.facets ?? null,
              sourceInventory: result.sourceInventory ?? null,
              uniqueAfterDedupe: result.uniqueAfterDedupe ?? null,
              hasMore: result.hasMore,
              warmupPending: result.feedWarmupSources.length > 0,
            })
          } catch {
            // ignore IDB write failures
          }
        }
        setLoading(false)
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        if (!cancelled && isActiveNewsOverviewSession(session)) {
          if (hydratedFromIdb) {
            logNewsOverview('feed_kept_idb_after_api_error', {
              pagePath: pathname,
              list: slug,
              facet: newsOverviewFacetLabelForLog(session.facet),
              message: e instanceof Error ? e.message : String(e),
            })
            setError(null)
            setPartialErrors([])
            setWarmupSources([])
            setLoading(false)
          } else {
            setItems([])
            setFeedFacets(null)
            setSourceInventory(null)
            setTotalArticleCount(null)
            setError(e instanceof Error ? e.message : 'Failed to load')
            setHasMore(false)
            setWarmupSources([])
          }
        }
      } finally {
        if (!cancelled && isActiveNewsOverviewSession(session)) {
          setInitialFeedRequestSettledState(true)
        }
        if (!cancelled && isActiveNewsOverviewSession(session) && !hydratedFromIdb) {
          setLoading(false)
        }
      }
    })().catch(() => undefined)

    return () => {
      cancelled = true
      loadMoreAbortRef.current?.abort()
      loadMoreAbortRef.current = null
      ac.abort()
    }
  }, [listSlug, fetchFeedPage, tagFilter, pathname])

  useEffect(() => {
    loadMoreRef.current = async () => {
      if (!getNewsOverviewLoadMoreEnabled(loading, loadingMore, hasMore, initialFeedRequestSettledRef.current, itemsRef.current.length) || loadMoreInFlightRef.current) {
        return
      }
      const slug = listSlugRef.current
      const offset = itemsRef.current.length
      const session: NewsOverviewSessionSnapshot = {
        token: feedSessionTokenRef.current,
        listSlug: slug,
        facet: tagFilterRef.current,
      }
      loadMoreAbortRef.current?.abort()
      const ac = new AbortController()
      loadMoreAbortRef.current = ac
      loadMoreInFlightRef.current = true
      setLoadingMore(true)
      logNewsOverview('load_more_trigger', {
        pagePath: pathname,
        list: slug,
        offset,
        facet: newsOverviewFacetLabelForLog(session.facet),
      })
      try {
        const result = await fetchFeedPage(slug, offset, {
          signal: ac.signal,
          feedAnchor: feedSessionAnchorRef.current ?? undefined,
          listTagFilter: session.facet,
          requestIntent: 'load_more',
        })
        if (ac.signal.aborted || !isActiveNewsOverviewSession(session)) {
          return
        }
        if (!result.ok) {
          return
        }
        setItems((prev) => [...prev, ...result.list])
        setHasMore(result.hasMore)
        setPartialErrors((prev) => newsOverviewMergePartialErrors(prev, result.errors))
        if (result.facets) {
          setFeedFacets(result.facets)
        }
        if (result.sourceInventory !== undefined) {
          setSourceInventory(result.sourceInventory)
        }
        if (result.uniqueAfterDedupe !== undefined) {
          setTotalArticleCount(result.uniqueAfterDedupe)
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
      } finally {
        const shouldClearBusy = loadMoreAbortRef.current === ac
        if (shouldClearBusy) {
          loadMoreAbortRef.current = null
        }
        if (shouldClearBusy) {
          loadMoreInFlightRef.current = false
          setLoadingMore(false)
        }
      }
    }
  }, [loading, loadingMore, hasMore, initialFeedRequestSettled, fetchFeedPage, pathname])

  useEffect(() => {
    if (!getNewsOverviewLoadMoreEnabled(loading, loadingMore, hasMore, initialFeedRequestSettled, items.length)) {
      return
    }
    const root = scrollRootRef.current
    const el = sentinelRef.current
    if (!root || !el) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMoreRef.current()
        }
      },
      { root, rootMargin: '280px 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, initialFeedRequestSettled, listSlug, items.length])

  useEffect(() => {
    const el = scrollRootRef.current
    if (!el) {
      return
    }
    function onScroll() {
      const node = scrollRootRef.current
      if (!node) {
        return
      }
      if (scrollBackToTopRafRef.current !== null) {
        return
      }
      scrollBackToTopRafRef.current = window.requestAnimationFrame(() => {
        scrollBackToTopRafRef.current = null
        const latestNode = scrollRootRef.current
        if (!latestNode) {
          return
        }
        const next = latestNode.scrollTop > NEWS_OVERVIEW_BACK_TO_TOP_SCROLL_THRESHOLD_PX
        setShowBackToTop((prev) => (prev === next ? prev : next))
      })
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (scrollBackToTopRafRef.current !== null) {
        window.cancelAnimationFrame(scrollBackToTopRafRef.current)
        scrollBackToTopRafRef.current = null
      }
    }
  }, [listSlug, tagFilter])

  /** Unique `key` per row; base key can repeat when the merged API returns duplicate link/title/source rows. */
  const itemRowKeys = useMemo(() => getNewsFeedItemRowKeys(items), [items])

  function scrollArticleListToTop() {
    scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return {
    items,
    loading,
    feedSessionBootstrap,
    initialFeedRequestSettled,
    loadingMore,
    hasMore,
    error,
    partialErrors,
    warmupSources,
    feedFacets,
    sourceInventory,
    totalArticleCount,
    showBackToTop,
    expandedSummaryKeys,
    setExpandedSummaryKeys,
    enteringItemKeys,
    scrollRootRef,
    sentinelRef,
    itemRowKeys,
    scrollArticleListToTop,
  }
}

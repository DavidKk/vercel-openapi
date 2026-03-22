import { type MutableRefObject, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import type { NewsOverviewFeedPageResult, NewsOverviewFetchFeedPageOptions } from '@/app/news/lib/fetch-news-overview-feed-page'
import { getNewsOverviewLoadMoreEnabled, type NewsOverviewSessionSnapshot } from '@/app/news/lib/news-feed-overview-display'
import { logNewsOverview } from '@/app/news/lib/news-overview-client-log'
import { newsOverviewFacetLabelForLog, newsOverviewMergePartialErrors, type NewsOverviewTagFilter } from '@/app/news/lib/news-overview-ui'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/**
 * Infinite-scroll loading for additional overview feed pages.
 * @param args Current loading/session state, refs, fetcher, and state updaters used when more rows arrive
 * @returns Loading-more state and a reset helper for session switches
 */
export function useNewsOverviewLoadMore(args: {
  pathname: string
  listSlug: string
  tagFilter: NewsOverviewTagFilter
  items: AggregatedNewsItem[]
  loading: boolean
  hasMore: boolean
  initialFeedRequestSettled: boolean
  initialFeedRequestSettledRef: MutableRefObject<boolean>
  listSlugRef: MutableRefObject<string>
  tagFilterRef: MutableRefObject<NewsOverviewTagFilter>
  itemsRef: MutableRefObject<AggregatedNewsItem[]>
  scrollRootRef: RefObject<HTMLDivElement | null>
  sentinelRef: RefObject<HTMLDivElement | null>
  feedSessionTokenRef: MutableRefObject<number>
  feedSessionAnchorRef: MutableRefObject<string | null>
  fetchFeedPage: (slug: string, offset: number, options?: NewsOverviewFetchFeedPageOptions) => Promise<NewsOverviewFeedPageResult>
  isActiveNewsOverviewSession: (session: NewsOverviewSessionSnapshot) => boolean
  setItems: React.Dispatch<React.SetStateAction<AggregatedNewsItem[]>>
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>
  setPartialErrors: React.Dispatch<React.SetStateAction<{ sourceId: string; message: string }[]>>
  setFeedFacets: React.Dispatch<React.SetStateAction<NewsFeedFacets | null>>
  setSourceInventory: React.Dispatch<React.SetStateAction<NewsFeedSourceInventoryRow[] | null>>
  setTotalArticleCount: React.Dispatch<React.SetStateAction<number | null>>
}) {
  const {
    pathname,
    items,
    loading,
    hasMore,
    initialFeedRequestSettled,
    initialFeedRequestSettledRef,
    listSlugRef,
    tagFilterRef,
    itemsRef,
    scrollRootRef,
    sentinelRef,
    feedSessionTokenRef,
    feedSessionAnchorRef,
    fetchFeedPage,
    isActiveNewsOverviewSession,
    setItems,
    setHasMore,
    setPartialErrors,
    setFeedFacets,
    setSourceInventory,
    setTotalArticleCount,
  } = args

  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<() => Promise<void>>(async () => {})
  const loadMoreAbortRef = useRef<AbortController | null>(null)
  /** Prevents overlapping load-more requests before `loadingMore` state updates. */
  const loadMoreInFlightRef = useRef(false)

  /**
   * Abort any running load-more request and reset local loading state.
   */
  const resetLoadMoreState = useCallback(() => {
    loadMoreAbortRef.current?.abort()
    loadMoreAbortRef.current = null
    loadMoreInFlightRef.current = false
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    return () => {
      loadMoreAbortRef.current?.abort()
      loadMoreAbortRef.current = null
    }
  }, [])

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
          loadMoreInFlightRef.current = false
          setLoadingMore(false)
        }
      }
    }
  }, [
    loading,
    loadingMore,
    hasMore,
    initialFeedRequestSettled,
    pathname,
    fetchFeedPage,
    feedSessionAnchorRef,
    feedSessionTokenRef,
    isActiveNewsOverviewSession,
    itemsRef,
    listSlugRef,
    setFeedFacets,
    setHasMore,
    setItems,
    setPartialErrors,
    setSourceInventory,
    setTotalArticleCount,
    tagFilterRef,
    initialFeedRequestSettledRef,
  ])

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
  }, [hasMore, items.length, initialFeedRequestSettled, loading, loadingMore, scrollRootRef, sentinelRef])

  return {
    loadingMore,
    resetLoadMoreState,
  }
}

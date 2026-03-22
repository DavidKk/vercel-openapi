import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { NewsOverviewFeedPageResult, NewsOverviewFetchFeedPageOptions } from '@/app/news/lib/fetch-news-overview-feed-page'
import type { NewsOverviewSessionSnapshot } from '@/app/news/lib/news-feed-overview-display'
import type { NewsOverviewTagFilter } from '@/app/news/lib/news-overview-ui'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/**
 * Warmup polling and manual retry controls for not-yet-ready feed sources.
 * @param args Current session identity, refs, fetcher, and merge callback
 * @returns Warmup busy flags, reset helper, and manual retry action
 */
export function useNewsOverviewWarmup(args: {
  listSlug: string
  tagFilter: NewsOverviewTagFilter
  listSlugRef: MutableRefObject<string>
  tagFilterRef: MutableRefObject<NewsOverviewTagFilter>
  warmupSources: { sourceId: string; message: string }[]
  warmupSourcesRef: MutableRefObject<{ sourceId: string; message: string }[]>
  feedSessionTokenRef: MutableRefObject<number>
  fetchFeedPage: (slug: string, offset: number, options?: NewsOverviewFetchFeedPageOptions) => Promise<NewsOverviewFeedPageResult>
  isActiveNewsOverviewSession: (session: NewsOverviewSessionSnapshot) => boolean
  applyWarmupFirstPageMerge: (r: {
    list: AggregatedNewsItem[]
    errors: { sourceId: string; message: string }[]
    feedWarmupSources: { sourceId: string; message: string }[]
    fetchedAt?: string
    facets?: NewsFeedFacets
    sourceInventory?: NewsFeedSourceInventoryRow[]
    uniqueAfterDedupe?: number
    hasMore?: boolean
  }) => void
}) {
  const {
    listSlug,
    tagFilter,
    listSlugRef,
    tagFilterRef,
    warmupSources,
    warmupSourcesRef,
    feedSessionTokenRef,
    fetchFeedPage,
    isActiveNewsOverviewSession,
    applyWarmupFirstPageMerge,
  } = args

  const [manualWarmupRetryUnlocked, setManualWarmupRetryUnlocked] = useState(false)
  /** True while the 5s interval warmup poll request is in flight (head skeleton + status line). */
  const [warmupPollBusy, setWarmupPollBusy] = useState(false)
  /** True while the user-triggered warmup retry request is in flight (same skeleton; separate from poll so they do not clear each other’s busy flag). */
  const [manualWarmupBusy, setManualWarmupBusy] = useState(false)

  /**
   * Skips a new interval tick while the previous warmup poll fetch is still running (avoids piling requests and bogus busy=false).
   */
  const warmupPollTickInFlightRef = useRef(false)
  const manualWarmupRetryAbortRef = useRef<AbortController | null>(null)

  const warmupSourceIdsKey = useMemo(
    () =>
      warmupSources
        .map((s) => s.sourceId)
        .sort()
        .join(','),
    [warmupSources]
  )

  /**
   * Abort any in-flight warmup work and reset warmup UI state for a new session.
   */
  const resetWarmupState = useCallback(() => {
    manualWarmupRetryAbortRef.current?.abort()
    manualWarmupRetryAbortRef.current = null
    warmupPollTickInFlightRef.current = false
    setManualWarmupRetryUnlocked(false)
    setWarmupPollBusy(false)
    setManualWarmupBusy(false)
  }, [])

  useEffect(() => {
    return () => {
      manualWarmupRetryAbortRef.current?.abort()
      manualWarmupRetryAbortRef.current = null
    }
  }, [])

  /**
   * After warmup sources appear, allow manual `retrySourceIds` after the same delay as the server hint.
   */
  useEffect(() => {
    if (warmupSources.length === 0) {
      setManualWarmupRetryUnlocked(false)
      return
    }
    setManualWarmupRetryUnlocked(false)
    const t = window.setTimeout(() => setManualWarmupRetryUnlocked(true), 5000)
    return () => window.clearTimeout(t)
  }, [listSlug, tagFilter, warmupSourceIdsKey, warmupSources.length])

  /**
   * Poll only failing warmup sources every 5s while the user stays on this list/facet; aborts on navigation.
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
      if (warmupPollTickInFlightRef.current) {
        return
      }
      warmupPollTickInFlightRef.current = true
      setWarmupPollBusy(true)
      const session: NewsOverviewSessionSnapshot = {
        token: feedSessionTokenRef.current,
        listSlug: slug,
        facet: tagFilterRef.current,
      }
      try {
        const r = await fetchFeedPage(slug, 0, {
          signal: ac.signal,
          listTagFilter: session.facet,
          requestIntent: 'warmup_poll',
          retrySourceIds: ids,
        })
        if (ac.signal.aborted || !isActiveNewsOverviewSession(session)) {
          return
        }
        if (r.ok && (r.code === undefined || r.code === 0)) {
          applyWarmupFirstPageMerge({
            list: r.list,
            errors: r.errors,
            feedWarmupSources: r.feedWarmupSources,
            fetchedAt: r.fetchedAt,
            facets: r.facets,
            sourceInventory: r.sourceInventory,
            uniqueAfterDedupe: r.uniqueAfterDedupe,
            hasMore: r.hasMore,
          })
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
      } finally {
        warmupPollTickInFlightRef.current = false
        setWarmupPollBusy(false)
      }
    }
    const intervalId = window.setInterval(run, 5000)
    return () => {
      ac.abort()
      window.clearInterval(intervalId)
      warmupPollTickInFlightRef.current = false
      setWarmupPollBusy(false)
    }
  }, [listSlug, warmupSourceIdsKey, fetchFeedPage, isActiveNewsOverviewSession, applyWarmupFirstPageMerge, feedSessionTokenRef, tagFilterRef, warmupSourcesRef])

  /**
   * Trigger an immediate retry for warmup sources after the unlock delay.
   */
  const runManualWarmupRetry = useCallback(async () => {
    const ids = warmupSourcesRef.current.map((r) => r.sourceId)
    if (ids.length === 0 || !manualWarmupRetryUnlocked) {
      return
    }
    manualWarmupRetryAbortRef.current?.abort()
    const ac = new AbortController()
    manualWarmupRetryAbortRef.current = ac
    setManualWarmupBusy(true)
    const session: NewsOverviewSessionSnapshot = {
      token: feedSessionTokenRef.current,
      listSlug: listSlugRef.current,
      facet: tagFilterRef.current,
    }
    try {
      const r = await fetchFeedPage(session.listSlug, 0, {
        signal: ac.signal,
        listTagFilter: session.facet,
        requestIntent: 'warmup_manual',
        retrySourceIds: ids,
      })
      if (ac.signal.aborted || !isActiveNewsOverviewSession(session)) {
        return
      }
      if (r.ok && (r.code === undefined || r.code === 0)) {
        applyWarmupFirstPageMerge({
          list: r.list,
          errors: r.errors,
          feedWarmupSources: r.feedWarmupSources,
          fetchedAt: r.fetchedAt,
          facets: r.facets,
          sourceInventory: r.sourceInventory,
          uniqueAfterDedupe: r.uniqueAfterDedupe,
          hasMore: r.hasMore,
        })
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return
      }
    } finally {
      const shouldClearBusy = manualWarmupRetryAbortRef.current === ac
      if (shouldClearBusy) {
        manualWarmupRetryAbortRef.current = null
        setManualWarmupBusy(false)
      }
    }
  }, [manualWarmupRetryUnlocked, warmupSourcesRef, feedSessionTokenRef, listSlugRef, tagFilterRef, fetchFeedPage, isActiveNewsOverviewSession, applyWarmupFirstPageMerge])

  return {
    manualWarmupRetryUnlocked,
    warmupRefreshUiBusy: warmupPollBusy || manualWarmupBusy,
    resetWarmupState,
    runManualWarmupRetry,
  }
}

'use client'

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TbArrowUp, TbNews } from 'react-icons/tb'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import { logNewsOverview, parseNewsPoolCacheFromHeader } from '@/app/news/lib/news-overview-client-log'
import { EmptyState } from '@/components/EmptyState'
import type { NewsFacetListFilter } from '@/services/news/facet-list-filter'
import { buildNewsOverviewHref, newsOverviewTagFiltersEqual, parseNewsFacetFromUrlSearchParams } from '@/services/news/news-overview-url'
import { isValidNewsCategory } from '@/services/news/sources'
import type { AggregatedNewsItem, NewsCategory, NewsFeedFacets } from '@/services/news/types'

/** Tab definition: API category id + short Chinese label for the overview */
const CATEGORY_TABS: { id: NewsCategory; label: string }[] = [
  { id: 'general-news', label: '综合新闻' },
  { id: 'tech-internet', label: '科技互联网' },
  { id: 'social-platform', label: '社交与平台' },
  { id: 'game-entertainment', label: '游戏文娱' },
  { id: 'science-academic', label: '科学学术' },
]

/** Page size for `/api/news/feed` (infinite scroll loads additional pages with `offset`). */
const PAGE_SIZE = 20

/**
 * Show a sidebar group when `distinctOptions.length` is **greater** than this (1 → need 2+ options).
 * Manifest tabs like 科技/社交/科学 only have 1–3 RSS sources, so 3+ was never reached for「来源」.
 */
const SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS = 1

/**
 * Minimum per-row count in the merged pool to list in the sidebar (server facets are full histograms).
 * Use 1 so small category pools still show RSS tags / sources that appear only once in the recent window.
 */
const MIN_SIDEBAR_TAG_ITEM_COUNT = 1

/**
 * UI copy for RSS `feedCategories` (maps to `tag` URL param and `feedCategory` API query).
 */
const RSS_TAG_LABEL = '标签'

/** Cap chips under each title so dense RSS category lists do not stretch cards. */
const MAX_RSS_SECTION_CHIPS_PER_CARD = 8

/** Show the list “back to top” control after scrolling this many pixels inside the article column. */
const BACK_TO_TOP_SCROLL_THRESHOLD_PX = 240

/** Sidebar buckets after server facet + client display thresholds */
interface TagSidebarBuckets {
  categories: { value: string; count: number }[]
  keywords: { value: string; count: number }[]
  sources: { sourceId: string; label: string; count: number }[]
}

const EMPTY_TAG_SIDEBAR: TagSidebarBuckets = {
  categories: [],
  keywords: [],
  sources: [],
}

/** Sidebar tag filter: null or facet passed to `/api/news/feed` for server-side list filtering before pagination */
type TagFilter = NewsFacetListFilter | null

/**
 * Compact facet description for client logs (avoid huge strings).
 * @param lt Active list filter or null
 * @returns Short label or null
 */
function facetLabelForLog(lt: TagFilter): string | null {
  if (!lt) {
    return null
  }
  if (lt.kind === 'fc') {
    return `rssTag:${lt.value.length > 48 ? `${lt.value.slice(0, 48)}…` : lt.value}`
  }
  if (lt.kind === 'fk') {
    return `keyword:${lt.value.length > 48 ? `${lt.value.slice(0, 48)}…` : lt.value}`
  }
  return `source:${lt.sourceId}`
}

/**
 * Strip basic HTML tags and collapse whitespace for card description lines.
 * @param html Raw summary from RSS (may contain markup)
 * @returns Plain text safe for one-line / clamped display
 */
function plainTextFromHtml(html: string): string {
  if (!html) {
    return ''
  }
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Format ISO date for subtitle line; returns empty string if invalid.
 * @param iso ISO string or null
 * @returns Short local date-time string
 */
function formatPublished(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const t = Date.parse(iso)
  if (Number.isNaN(t)) {
    return ''
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(t))
  } catch {
    return ''
  }
}

/**
 * Merge partial feed errors by `sourceId` (later message wins for the same id).
 * @param prev Existing errors
 * @param next New errors from a page response
 * @returns Deduplicated list
 */
function mergePartialErrors(prev: { sourceId: string; message: string }[], next: { sourceId: string; message: string }[]): { sourceId: string; message: string }[] {
  const map = new Map(prev.map((e) => [e.sourceId, e]))
  for (const e of next) {
    map.set(e.sourceId, e)
  }
  return [...map.values()]
}

interface FeedEnvelope {
  code?: number
  message?: string
  data?: {
    items?: AggregatedNewsItem[]
    errors?: { sourceId: string; message: string }[]
    fetchedAt?: string
    mergeStats?: {
      hasMore?: boolean
      uniqueAfterDedupe?: number
      sourcesRequested?: number
      sourcesWithItems?: number
    }
    facets?: NewsFeedFacets
  }
}

/**
 * News overview: category tabs and a blog-style list (title + description) from the aggregated feed API.
 */
export function NewsOverview() {
  const params = useParams<{ category: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [active, setActive] = useState<NewsCategory>('general-news')
  const [tagFilter, setTagFilter] = useState<TagFilter>(null)
  const [items, setItems] = useState<AggregatedNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partialErrors, setPartialErrors] = useState<{ sourceId: string; message: string }[]>([])
  /** Facet histograms from the API over the full merged pool (not derived from loaded pages). */
  const [feedFacets, setFeedFacets] = useState<NewsFeedFacets | null>(null)
  /** Total rows in the merged pool for the current category session (`mergeStats.uniqueAfterDedupe`). */
  const [totalArticleCount, setTotalArticleCount] = useState<number | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<AggregatedNewsItem[]>([])
  const activeRef = useRef(active)
  const tagFilterRef = useRef<TagFilter>(null)
  const loadMoreRef = useRef<() => Promise<void>>(async () => {})
  /** Prevents overlapping load-more requests before `loadingMore` state updates. */
  const loadMoreInFlightRef = useRef(false)
  /**
   * First-page `data.fetchedAt` (ISO). Sent as `feedAnchor` on load-more so the server uses the same
   * rolling time window and stable merge order for `offset` slices.
   */
  const feedSessionAnchorRef = useRef<string | null>(null)
  /** Dedupe `route_sync` logs when the URL-derived sync key is unchanged. */
  const lastRouteSyncKeyRef = useRef<string | null>(null)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    tagFilterRef.current = tagFilter
  }, [tagFilter])

  /**
   * Update `/news/[category]` URL with optional `tag`, `keyword`, or `source` search params.
   */
  const replaceOverviewUrl = useCallback(
    (next: { category: NewsCategory; tagFilter: TagFilter }) => {
      const href = buildNewsOverviewHref(next.category, next.tagFilter)
      logNewsOverview('router_replace', {
        pagePath: pathname,
        category: next.category,
        facet: facetLabelForLog(next.tagFilter),
        href,
      })
      router.replace(href, { scroll: false })
    },
    [router, pathname]
  )

  /**
   * Toggle RSS section facet (`feedCategory`); same URL/query behavior as the sidebar section list.
   * @param value RSS category label from `feedCategories`
   */
  const toggleFeedCategoryFacet = useCallback(
    (value: string) => {
      const cat = isValidNewsCategory(params.category) ? (params.category as NewsCategory) : 'general-news'
      const on = tagFilter?.kind === 'fc' && tagFilter.value === value
      if (on) {
        replaceOverviewUrl({ category: cat, tagFilter: null })
      } else {
        replaceOverviewUrl({ category: cat, tagFilter: { kind: 'fc', value } })
      }
    },
    [params.category, tagFilter, replaceOverviewUrl]
  )

  /** Sync tab + sidebar selection from path + search params (back/forward, shared links). */
  const facetSearchKey = searchParams.toString()
  useEffect(() => {
    const cat = isValidNewsCategory(params.category) ? (params.category as NewsCategory) : 'general-news'
    const q = parseNewsFacetFromUrlSearchParams(searchParams)
    const syncKey = `${cat}|${facetSearchKey}`
    if (lastRouteSyncKeyRef.current !== syncKey) {
      lastRouteSyncKeyRef.current = syncKey
      logNewsOverview('route_sync', {
        pagePath: pathname,
        category: cat,
        searchParamsPresent: facetSearchKey.length > 0,
        facet: facetLabelForLog(q),
      })
    }
    setActive((prev) => (prev === cat ? prev : cat))
    setTagFilter((prev) => (newsOverviewTagFiltersEqual(prev, q) ? prev : q))
  }, [params.category, facetSearchKey, searchParams, pathname])

  const tagSidebar = useMemo((): TagSidebarBuckets => {
    if (!feedFacets) {
      return EMPTY_TAG_SIDEBAR
    }
    const categories = feedFacets.categories.filter((row) => row.count >= MIN_SIDEBAR_TAG_ITEM_COUNT)
    const keywords = feedFacets.keywords.filter((row) => row.count >= MIN_SIDEBAR_TAG_ITEM_COUNT)
    const sources = feedFacets.sources.filter((row) => row.count >= MIN_SIDEBAR_TAG_ITEM_COUNT)
    return { categories, keywords, sources }
  }, [feedFacets])

  const showCategorySidebar = tagSidebar.categories.length > SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS
  const showKeywordSidebar = tagSidebar.keywords.length > SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS
  const showSourceSidebar = tagSidebar.sources.length > SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS

  const fetchFeedPage = useCallback(
    async (
      category: NewsCategory,
      offset: number,
      options?: {
        signal?: AbortSignal
        feedAnchor?: string
        listTagFilter?: TagFilter
        /** initial first page vs infinite scroll */
        requestIntent?: 'initial' | 'load_more'
      }
    ) => {
      const q = new URLSearchParams({
        category,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (offset > 0 && options?.feedAnchor) {
        q.set('feedAnchor', options.feedAnchor)
      }
      const lt = options?.listTagFilter
      if (lt) {
        if (lt.kind === 'fc') {
          q.set('feedCategory', lt.value)
        } else if (lt.kind === 'fk') {
          q.set('feedKeyword', lt.value)
        } else {
          q.set('feedSourceId', lt.sourceId)
        }
      }
      const queryString = q.toString()
      const apiPath = `/api/news/feed?${queryString}`
      const intent = options?.requestIntent ?? 'initial'
      logNewsOverview('feed_request', {
        intent,
        pagePath: pathname,
        category,
        offset,
        pageSize: PAGE_SIZE,
        facet: facetLabelForLog(lt ?? null),
        feedAnchor: offset > 0 && options?.feedAnchor ? options.feedAnchor.slice(0, 40) : null,
        apiPath,
      })
      const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      let res: Response
      try {
        res = await fetch(apiPath, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: options?.signal,
        })
      } catch (e) {
        const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
        if (e instanceof Error && e.name === 'AbortError') {
          logNewsOverview('feed_aborted', {
            intent,
            pagePath: pathname,
            category,
            offset,
            durationMs,
          })
          throw e
        }
        logNewsOverview('feed_network_error', {
          intent,
          pagePath: pathname,
          category,
          offset,
          durationMs,
          message: e instanceof Error ? e.message : String(e),
        })
        throw e
      }
      const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
      const poolCacheFromHeader = parseNewsPoolCacheFromHeader(res.headers.get('X-Cache-Hit'))
      const text = await res.text()
      if (!res.ok) {
        logNewsOverview('feed_http_error', {
          intent,
          pagePath: pathname,
          category,
          offset,
          durationMs,
          httpStatus: res.status,
          ...poolCacheFromHeader,
          bodyPreview: text.slice(0, 200),
        })
        return { ok: false as const, status: res.status, text }
      }
      let parsed: FeedEnvelope
      try {
        parsed = JSON.parse(text) as FeedEnvelope
      } catch {
        logNewsOverview('feed_json_error', {
          intent,
          pagePath: pathname,
          category,
          offset,
          durationMs,
          httpStatus: res.status,
          ...poolCacheFromHeader,
        })
        return { ok: false as const, status: res.status, text: 'Invalid JSON response' }
      }
      const data = parsed.data
      const list = Array.isArray(data?.items) ? data.items : []
      const more = data?.mergeStats?.hasMore === true
      const errs = Array.isArray(data?.errors) ? data.errors : []
      const code = parsed.code
      const message = parsed.message
      const fetchedAt = typeof data?.fetchedAt === 'string' ? data.fetchedAt : undefined
      const facets = data?.facets ?? undefined
      const uniqueAfterDedupe = typeof data?.mergeStats?.uniqueAfterDedupe === 'number' ? data.mergeStats.uniqueAfterDedupe : undefined
      const sourcesLine = data?.mergeStats !== undefined ? `${data.mergeStats.sourcesWithItems ?? '?'}/${data.mergeStats.sourcesRequested ?? '?'}` : null
      logNewsOverview('feed_response', {
        intent,
        pagePath: pathname,
        category,
        offset,
        durationMs,
        httpStatus: res.status,
        ...poolCacheFromHeader,
        itemsReturned: list.length,
        hasMore: more,
        poolTotalAfterDedupe: uniqueAfterDedupe ?? null,
        partialSourceErrors: errs.length,
        envelopeCode: code ?? null,
        fetchedAt: fetchedAt ?? null,
        sourcesWithItems: sourcesLine,
        userAgentSnippet: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 120) : null,
      })
      if (code !== undefined && code !== 0) {
        logNewsOverview('feed_envelope_error', {
          intent,
          pagePath: pathname,
          category,
          offset,
          ...poolCacheFromHeader,
          code,
          message: message ?? null,
        })
      }
      return { ok: true as const, list, hasMore: more, errors: errs, code, message, fetchedAt, facets, uniqueAfterDedupe }
    },
    [pathname]
  )

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    const category = active

    const root = scrollRootRef.current
    if (root) {
      root.scrollTop = 0
    }
    setShowBackToTop(false)

    feedSessionAnchorRef.current = null
    setLoading(true)
    setLoadingMore(false)
    loadMoreInFlightRef.current = false
    setError(null)
    setPartialErrors([])
    setItems([])
    setFeedFacets(null)
    setTotalArticleCount(null)
    setHasMore(true)
    ;(async () => {
      logNewsOverview('feed_session_start', {
        pagePath: pathname,
        category,
        facet: facetLabelForLog(tagFilter),
      })
      try {
        const result = await fetchFeedPage(category, 0, {
          signal: ac.signal,
          listTagFilter: tagFilter,
          requestIntent: 'initial',
        })
        if (cancelled || category !== activeRef.current) {
          return
        }
        if (!result.ok) {
          setItems([])
          setFeedFacets(null)
          setTotalArticleCount(null)
          setError(result.text || `HTTP ${result.status}`)
          setHasMore(false)
          return
        }
        if (result.code !== undefined && result.code !== 0) {
          setError(result.message ?? 'Request failed')
        }
        setItems(result.list)
        setHasMore(result.hasMore)
        setPartialErrors(result.errors)
        if (result.fetchedAt) {
          feedSessionAnchorRef.current = result.fetchedAt
        }
        if (result.facets) {
          setFeedFacets(result.facets)
        }
        if (result.uniqueAfterDedupe !== undefined) {
          setTotalArticleCount(result.uniqueAfterDedupe)
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        if (!cancelled && category === activeRef.current) {
          setItems([])
          setFeedFacets(null)
          setTotalArticleCount(null)
          setError(e instanceof Error ? e.message : 'Failed to load')
          setHasMore(false)
        }
      } finally {
        if (!cancelled && category === activeRef.current) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [active, fetchFeedPage, tagFilter, pathname])

  /**
   * Clear sidebar facet and drop `query` from the URL (same manifest category tab).
   */
  function clearTagFilterAndReload() {
    const cat = isValidNewsCategory(params.category) ? (params.category as NewsCategory) : 'general-news'
    replaceOverviewUrl({ category: cat, tagFilter: null })
  }

  useEffect(() => {
    loadMoreRef.current = async () => {
      if (loading || loadingMore || !hasMore || loadMoreInFlightRef.current) {
        return
      }
      const category = activeRef.current
      const offset = itemsRef.current.length
      if (offset === 0) {
        return
      }
      loadMoreInFlightRef.current = true
      setLoadingMore(true)
      logNewsOverview('load_more_trigger', {
        pagePath: pathname,
        category,
        offset,
        facet: facetLabelForLog(tagFilterRef.current),
      })
      try {
        const result = await fetchFeedPage(category, offset, {
          feedAnchor: feedSessionAnchorRef.current ?? undefined,
          listTagFilter: tagFilterRef.current,
          requestIntent: 'load_more',
        })
        if (category !== activeRef.current) {
          return
        }
        if (!result.ok) {
          return
        }
        setItems((prev) => [...prev, ...result.list])
        setHasMore(result.hasMore)
        setPartialErrors((prev) => mergePartialErrors(prev, result.errors))
        if (result.facets) {
          setFeedFacets(result.facets)
        }
        if (result.uniqueAfterDedupe !== undefined) {
          setTotalArticleCount(result.uniqueAfterDedupe)
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
      } finally {
        loadMoreInFlightRef.current = false
        setLoadingMore(false)
      }
    }
  }, [loading, loadingMore, hasMore, fetchFeedPage, pathname])

  useEffect(() => {
    if (!hasMore || loading || loadingMore) {
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
  }, [hasMore, loading, loadingMore, active, items.length])

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
      setShowBackToTop(node.scrollTop > BACK_TO_TOP_SCROLL_THRESHOLD_PX)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [active, tagFilter])

  function scrollArticleListToTop() {
    scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <header className={`${CONTENT_HEADER_CLASS} min-h-[63px] gap-3 bg-white`}>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-gray-900">News</h1>
          <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-gray-500">Read aggregated headlines by category in one place.</p>
        </div>
        <nav
          className="ml-auto flex max-w-[min(100%,36rem)] shrink-0 justify-end overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="News categories"
        >
          <div className="flex h-[38px] min-w-min items-stretch rounded-lg border border-gray-200 bg-gray-50 p-1" role="tablist">
            {CATEGORY_TABS.map((tab) => {
              const isOn = tab.id === active
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isOn}
                  onClick={() => replaceOverviewUrl({ category: tab.id, tagFilter: null })}
                  className={`flex shrink-0 items-center rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                    isOn ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-current={isOn ? 'true' : undefined}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
        <div className="relative min-h-0 min-w-0 flex-1 basis-0">
          <div
            ref={scrollRootRef}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {error && !loading && items.length === 0 ? <div className="rounded-lg border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] text-red-800">{error}</div> : null}

            {loading ? (
              <ul className="mx-auto max-w-3xl shrink-0 space-y-3" aria-busy="true" aria-label="Loading articles">
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
                    <div className="mt-3 space-y-2">
                      <div className="h-3 w-full rounded bg-gray-100" />
                      <div className="h-3 w-5/6 rounded bg-gray-100" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {!loading && items.length === 0 && !error ? (
              <div className="flex min-h-[50vh] w-full shrink-0 flex-col">
                <EmptyState icon={<TbNews className="h-12 w-12 text-gray-400/30 opacity-70" />} message="暂无数据" />
              </div>
            ) : null}

            {!loading && items.length > 0 ? (
              <ul className="mx-auto max-w-3xl shrink-0 space-y-3" aria-label="Article list">
                {items.map((item, idx) => {
                  const desc = plainTextFromHtml(item.summary ?? '')
                  const fallbackDesc = !desc ? `${item.sourceLabel} · ${item.region === 'cn' ? '内地/中文' : '港台'}` : desc
                  const when = formatPublished(item.publishedAt)
                  return (
                    <li key={`${item.sourceId}-${item.link}-${item.publishedAt ?? ''}-${idx}`}>
                      <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[15px] font-semibold leading-snug text-gray-900 underline-offset-2 hover:text-blue-700 hover:underline"
                        >
                          {item.title}
                        </a>
                        {item.feedCategories && item.feedCategories.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${RSS_TAG_LABEL}（筛选）`}>
                            {item.feedCategories.slice(0, MAX_RSS_SECTION_CHIPS_PER_CARD).map((fc, chipIdx) => {
                              const chipOn = tagFilter?.kind === 'fc' && tagFilter.value === fc
                              return (
                                <button
                                  key={`card-${idx}-${chipIdx}-${fc}`}
                                  type="button"
                                  onClick={() => toggleFeedCategoryFacet(fc)}
                                  className={`max-w-full truncate rounded-md px-2 py-0.5 text-left text-[10px] font-medium transition-colors ${
                                    chipOn ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/90 hover:bg-slate-200/80'
                                  }`}
                                  title={`标签：${fc}`}
                                >
                                  {fc}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                        <p className="mt-1.5 text-[11px] text-gray-500">
                          {item.sourceLabel}
                          {when ? ` · ${when}` : ''}
                        </p>
                        <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-gray-600">{fallbackDesc}</p>
                      </article>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {loadingMore ? (
              <ul className="mx-auto mt-3 max-w-3xl shrink-0 space-y-3" aria-busy="true" aria-label="Loading more articles">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={`more-${i}`} className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="h-4 w-2/3 rounded bg-gray-200" />
                    <div className="mt-2 h-3 w-1/4 rounded bg-gray-100" />
                    <div className="mt-3 h-3 w-full rounded bg-gray-100" />
                  </li>
                ))}
              </ul>
            ) : null}

            {!loading && !loadingMore && hasMore ? <div ref={sentinelRef} className="mx-auto h-2 max-w-3xl shrink-0" aria-hidden /> : null}

            {!loading && !loadingMore && !hasMore && items.length > 0 ? (
              <p className="mx-auto mt-6 max-w-3xl text-center text-[11px] text-gray-400" role="status">
                End of the feed for this category.
              </p>
            ) : null}

            {!loading && partialErrors.length > 0 ? (
              <p className="mx-auto mt-4 max-w-3xl text-[11px] text-amber-800">
                部分来源未能拉取（{partialErrors.length}）：{partialErrors.map((e) => e.sourceId).join(', ')}
              </p>
            ) : null}
          </div>

          {showBackToTop ? (
            <button
              type="button"
              className="absolute bottom-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={scrollArticleListToTop}
              aria-label="回到顶部"
            >
              <TbArrowUp className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>

        <aside
          className="flex min-h-0 w-[9.25rem] min-w-0 shrink-0 grow-0 flex-col overflow-hidden border-l border-gray-200 bg-white sm:w-36 lg:w-[13.5rem] xl:w-60"
          aria-label={`${RSS_TAG_LABEL}、关键词与来源筛选`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {showCategorySidebar ? (
              <section className="mt-2 first:mt-0">
                <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{RSS_TAG_LABEL}</h2>
                <div className="flex flex-col gap-1">
                  {tagSidebar.categories.map(({ value, count }) => {
                    const on = tagFilter?.kind === 'fc' && tagFilter.value === value
                    return (
                      <button
                        key={`fc-${value}`}
                        type="button"
                        onClick={() => toggleFeedCategoryFacet(value)}
                        className={`flex w-full max-w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                          on ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200/90'
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium" title={value}>
                          {value}
                        </span>
                        <span className={`shrink-0 tabular-nums ${on ? 'text-slate-200' : 'text-slate-500'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {showKeywordSidebar ? (
              <section className="mt-3">
                <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700/90">关键词</h2>
                <div className="flex flex-col gap-1">
                  {tagSidebar.keywords.map(({ value, count }) => {
                    const on = tagFilter?.kind === 'fk' && tagFilter.value === value
                    return (
                      <button
                        key={`fk-${value}`}
                        type="button"
                        onClick={() => {
                          const cat = isValidNewsCategory(params.category) ? (params.category as NewsCategory) : 'general-news'
                          if (on) {
                            replaceOverviewUrl({ category: cat, tagFilter: null })
                          } else {
                            replaceOverviewUrl({ category: cat, tagFilter: { kind: 'fk', value } })
                          }
                        }}
                        className={`flex w-full max-w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                          on ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-950 ring-1 ring-amber-200/80 hover:bg-amber-100'
                        }`}
                      >
                        <span className="min-w-0 truncate" title={value}>
                          {value}
                        </span>
                        <span className={`shrink-0 tabular-nums ${on ? 'text-amber-100' : 'text-amber-800/80'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {showSourceSidebar ? (
              <section className="mt-3">
                <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700/90">来源</h2>
                <div className="flex flex-col gap-1">
                  {tagSidebar.sources.map(({ sourceId, label, count }) => {
                    const on = tagFilter?.kind === 'src' && tagFilter.sourceId === sourceId
                    return (
                      <button
                        key={`src-${sourceId}`}
                        type="button"
                        onClick={() => {
                          const cat = isValidNewsCategory(params.category) ? (params.category as NewsCategory) : 'general-news'
                          if (on) {
                            replaceOverviewUrl({ category: cat, tagFilter: null })
                          } else {
                            replaceOverviewUrl({ category: cat, tagFilter: { kind: 'src', sourceId } })
                          }
                        }}
                        className={`flex w-full max-w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                          on ? 'bg-violet-700 text-white' : 'border border-violet-200/90 bg-violet-50/90 text-violet-950 hover:bg-violet-100'
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium" title={label}>
                          {label}
                        </span>
                        <span className={`shrink-0 tabular-nums ${on ? 'text-violet-100' : 'text-violet-700/90'}`}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>
          <div className="shrink-0 border-t border-gray-100 p-2">
            <button
              type="button"
              disabled={!tagFilter}
              onClick={clearTagFilterAndReload}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              全部
            </button>
          </div>
        </aside>
      </div>

      <footer
        className="flex shrink-0 flex-col gap-0.5 border-t border-gray-200 bg-white px-4 py-1.5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-end sm:gap-3"
        role="status"
        aria-live="polite"
      >
        <span className="self-end sm:self-auto">
          {loading && totalArticleCount === null ? (
            <span className="text-gray-400">…</span>
          ) : totalArticleCount !== null ? (
            <>
              当前列表共 <span className="font-semibold tabular-nums text-gray-800">{totalArticleCount}</span> 篇
              {items.length > 0 && items.length < totalArticleCount ? (
                <>
                  {' '}
                  · 已加载 <span className="tabular-nums">{items.length}</span> 篇
                </>
              ) : null}
            </>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </span>
      </footer>
    </div>
  )
}

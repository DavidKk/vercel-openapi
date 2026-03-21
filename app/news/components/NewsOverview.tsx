'use client'

import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TbArrowUp, TbNews } from 'react-icons/tb'

import { logNewsOverview, parseNewsPoolCacheFromHeader } from '@/app/news/lib/news-overview-client-log'
import { Button } from '@/components/Button'
import { DropdownSelect } from '@/components/DropdownSelect'
import { EmptyState } from '@/components/EmptyState'
import { LazyImage } from '@/components/LazyImage'
import { buildNewsFeedOverviewIdbKey, getNewsFeedOverviewFromIdb, setNewsFeedOverviewInIdb } from '@/services/news/browser/idb-cache'
import type { NewsFacetListFilter } from '@/services/news/facet-list-filter'
import { buildNewsOverviewHref, newsOverviewTagFiltersEqual, parseNewsFacetFromUrlSearchParams } from '@/services/news/news-overview-url'
import { getNewsListLabel, NEWS_LIST_SLUGS_ORDER, normalizeNewsListSlug } from '@/services/news/news-subcategories'
import { filterNewsSources } from '@/services/news/sources'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/** Page size for `/api/news/feed` (infinite scroll loads additional pages with `offset`). */
const PAGE_SIZE = 20

/**
 * Default merged RSS source cap when `/api/news/feed` omits `maxFeeds` (keep in sync with that route).
 */
const DEFAULT_FEED_MAX_SOURCES = 15

/**
 * Show a sidebar group when `distinctOptions.length` is **greater** than this (`0` → show if any option exists).
 * Using `1` hid the Sources sidebar group when only one manifest RSS applied or only one source had items in the window.
 */
const SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS = 0

/**
 * Minimum per-row count in the merged pool to list in the sidebar (server facets are full histograms).
 * Use 1 so small category pools still show RSS tags / sources that appear only once in the recent window.
 */
const MIN_SIDEBAR_TAG_ITEM_COUNT = 1

/**
 * UI copy for RSS `feedCategories` (maps to `tag` URL param and `feedCategory` API query).
 */
const RSS_TAG_LABEL = 'Tags'

/** Cap chips under each title so dense RSS category lists do not stretch cards. */
const MAX_RSS_SECTION_CHIPS_PER_CARD = 8

/**
 * Plain-text summary length above which the card shows a line-clamped preview until the user expands.
 */
const SUMMARY_EXPAND_THRESHOLD_CHARS = 320

/** Show the list “back to top” control after scrolling this many pixels inside the article column. */
const BACK_TO_TOP_SCROLL_THRESHOLD_PX = 240

/** Sidebar buckets after server facet + client display thresholds */
interface TagSidebarBuckets {
  categories: { value: string; count: number }[]
  keywords: { value: string; count: number }[]
}

const EMPTY_TAG_SIDEBAR: TagSidebarBuckets = {
  categories: [],
  keywords: [],
}

/**
 * Sidebar count as `pool/raw`: merged-list citations vs latest RSS parse size.
 * @param poolCount Rows in the merged pool that cite this outlet (headline or same-story merge)
 * @param parsedCount Items parsed from RSS for this source on the last fetch
 * @returns Compact label, e.g. `1/50` or `0`
 */
function sourceSidebarCountLabel(poolCount: number, parsedCount: number): string {
  if (parsedCount > 0) {
    return `${poolCount}/${parsedCount}`
  }
  return poolCount > 0 ? String(poolCount) : '0'
}

/**
 * Tooltip for a manifest source row: label, optional site URL, then fetch error or pool vs raw RSS hint.
 * @param parts Row metadata
 * @returns Single-line tooltip string
 */
function sourceSidebarRowTitle(parts: { label: string; siteUrl: string; poolCount: number; parsedCount: number; fetchError?: string }): string {
  const segments: string[] = [parts.label]
  if (parts.siteUrl) {
    segments.push(parts.siteUrl)
  }
  if (parts.fetchError) {
    segments.push(parts.fetchError)
  } else if (parts.parsedCount > 0) {
    if (parts.poolCount > 0) {
      segments.push(
        `pool/raw ${parts.poolCount}/${parts.parsedCount}: left = rows in the merged list citing this outlet (headline or same-story merge); right = RSS items parsed. The gap is usually outside the time window, deduped, or bad links — not counted per source. Click filters rows that include this outlet.`
      )
    } else {
      segments.push(`0/${parts.parsedCount}: RSS returned ${parts.parsedCount} item(s); none in the merged list (often outside the recent window, deduped, or missing links).`)
    }
  } else if (parts.poolCount > 0) {
    segments.push('In merged list only (no raw parse count on this response). Click filters rows that cite this outlet.')
  } else {
    segments.push('No items in the current time window')
  }
  return segments.join(' · ')
}

/**
 * Normalize the `[slug]` route param for the initial client state (avoids a spurious `headlines` fetch before `useEffect` sync).
 * @param slug `useParams().slug`
 * @returns Canonical list slug
 */
function listSlugFromRouteParam(slug: string | string[] | undefined): string {
  const raw = Array.isArray(slug) ? slug[0] : slug
  return normalizeNewsListSlug(raw ?? undefined)
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
 * Strip basic HTML tags and collapse whitespace for card body text.
 * @param html Raw summary from RSS (may contain markup)
 * @returns Plain text safe for multi-line display (word-wrapped in the card)
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
    sourceInventory?: NewsFeedSourceInventoryRow[]
  }
}

/**
 * News overview: flat list selector and a blog-style list (title + description) from the aggregated feed API.
 */
export function NewsOverview() {
  const params = useParams<{ slug: string }>()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [listSlug, setListSlug] = useState(() => listSlugFromRouteParam(params.slug))
  const [tagFilter, setTagFilter] = useState<TagFilter>(null)
  const [items, setItems] = useState<AggregatedNewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partialErrors, setPartialErrors] = useState<{ sourceId: string; message: string }[]>([])
  /** Facet histograms from the API over the full merged pool (not derived from loaded pages). */
  const [feedFacets, setFeedFacets] = useState<NewsFeedFacets | null>(null)
  /** Per-source parsed vs pool counts from the API (explains 0 in list when RSS still returned rows). */
  const [sourceInventory, setSourceInventory] = useState<NewsFeedSourceInventoryRow[] | null>(null)
  /** Total rows in the merged pool for the current category session (`mergeStats.uniqueAfterDedupe`). */
  const [totalArticleCount, setTotalArticleCount] = useState<number | null>(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  /** Row keys (see article list `key`) with expanded long summaries; reset when list or URL facets change. */
  const [expandedSummaryKeys, setExpandedSummaryKeys] = useState<Record<string, true>>({})
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<AggregatedNewsItem[]>([])
  const listSlugRef = useRef(listSlug)
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
    listSlugRef.current = listSlug
  }, [listSlug])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    tagFilterRef.current = tagFilter
  }, [tagFilter])

  useEffect(() => {
    setExpandedSummaryKeys({})
  }, [listSlug, searchParams.toString()])

  /**
   * Update `/news/[slug]` URL with optional `tag`, `keyword`, or `source` search params.
   */
  const replaceOverviewUrl = useCallback(
    (next: { listSlug: string; tagFilter: TagFilter }) => {
      const slug = normalizeNewsListSlug(next.listSlug)
      const href = buildNewsOverviewHref(slug, next.tagFilter)
      logNewsOverview('router_replace', {
        pagePath: pathname,
        list: slug,
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
      const slug = listSlugRef.current
      const on = tagFilter?.kind === 'fc' && tagFilter.value === value
      if (on) {
        replaceOverviewUrl({ listSlug: slug, tagFilter: null })
      } else {
        replaceOverviewUrl({ listSlug: slug, tagFilter: { kind: 'fc', value } })
      }
    },
    [tagFilter, replaceOverviewUrl]
  )

  /** Sync tab + sidebar selection from path + search params (back/forward, shared links). */
  const facetSearchKey = searchParams.toString()
  useEffect(() => {
    const slug = normalizeNewsListSlug(params.slug)
    const q = parseNewsFacetFromUrlSearchParams(searchParams)
    const syncKey = `${slug}|${facetSearchKey}`
    if (lastRouteSyncKeyRef.current !== syncKey) {
      lastRouteSyncKeyRef.current = syncKey
      logNewsOverview('route_sync', {
        pagePath: pathname,
        list: slug,
        searchParamsPresent: facetSearchKey.length > 0,
        facet: facetLabelForLog(q),
      })
    }
    setListSlug((prev) => (prev === slug ? prev : slug))
    setTagFilter((prev) => (newsOverviewTagFiltersEqual(prev, q) ? prev : q))
  }, [params.slug, facetSearchKey, searchParams, pathname])

  const tagSidebar = useMemo((): TagSidebarBuckets => {
    if (!feedFacets) {
      return EMPTY_TAG_SIDEBAR
    }
    const categories = feedFacets.categories.filter((row) => row.count >= MIN_SIDEBAR_TAG_ITEM_COUNT)
    const keywords = feedFacets.keywords.filter((row) => row.count >= MIN_SIDEBAR_TAG_ITEM_COUNT)
    return { categories, keywords }
  }, [feedFacets])

  const facetSourceCountById = useMemo(() => {
    const m = new Map<string, number>()
    for (const row of feedFacets?.sources ?? []) {
      m.set(row.sourceId, row.count)
    }
    return m
  }, [feedFacets])

  const partialErrorBySourceId = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of partialErrors) {
      m.set(e.sourceId, e.message)
    }
    return m
  }, [partialErrors])

  const sourceInventoryById = useMemo(() => new Map((sourceInventory ?? []).map((r) => [r.sourceId, r])), [sourceInventory])

  /** All manifest sources for this channel (same cap as default feed merge), with pool + parsed counts when API sends inventory. */
  const sourceSidebarRows = useMemo(() => {
    const slug = normalizeNewsListSlug(listSlug)
    return filterNewsSources(undefined, undefined, undefined, slug)
      .slice(0, DEFAULT_FEED_MAX_SOURCES)
      .map((s) => {
        const inv = sourceInventoryById.get(s.id)
        const poolCount = inv?.poolCount ?? facetSourceCountById.get(s.id) ?? 0
        const parsedCount = inv?.parsedCount ?? 0
        return {
          sourceId: s.id,
          label: s.label,
          siteUrl: s.defaultUrl?.trim() ?? '',
          poolCount,
          parsedCount,
        }
      })
  }, [listSlug, facetSourceCountById, sourceInventoryById])

  const channelOptions = useMemo(() => NEWS_LIST_SLUGS_ORDER.map((slug) => ({ value: slug, label: getNewsListLabel(slug) })), [])

  const showCategorySidebar = tagSidebar.categories.length > SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS
  const showKeywordSidebar = tagSidebar.keywords.length > SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS
  const showSourceSidebar = sourceSidebarRows.length > 0

  const fetchFeedPage = useCallback(
    async (
      slug: string,
      offset: number,
      options?: {
        signal?: AbortSignal
        feedAnchor?: string
        listTagFilter?: TagFilter
        /** initial first page vs infinite scroll */
        requestIntent?: 'initial' | 'load_more'
      }
    ) => {
      const listNorm = normalizeNewsListSlug(slug)
      const q = new URLSearchParams({
        list: listNorm,
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
        list: listNorm,
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
            list: listNorm,
            offset,
            durationMs,
          })
          throw e
        }
        logNewsOverview('feed_network_error', {
          intent,
          pagePath: pathname,
          list: listNorm,
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
          list: listNorm,
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
          list: listNorm,
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
      const sourceInventory = Array.isArray(data?.sourceInventory) ? (data.sourceInventory as NewsFeedSourceInventoryRow[]) : undefined
      const uniqueAfterDedupe = typeof data?.mergeStats?.uniqueAfterDedupe === 'number' ? data.mergeStats.uniqueAfterDedupe : undefined
      const sourcesLine = data?.mergeStats !== undefined ? `${data.mergeStats.sourcesWithItems ?? '?'}/${data.mergeStats.sourcesRequested ?? '?'}` : null
      logNewsOverview('feed_response', {
        intent,
        pagePath: pathname,
        list: listNorm,
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
          list: listNorm,
          offset,
          ...poolCacheFromHeader,
          code,
          message: message ?? null,
        })
      }
      return {
        ok: true as const,
        list,
        hasMore: more,
        errors: errs,
        code,
        message,
        fetchedAt,
        facets,
        uniqueAfterDedupe,
        sourceInventory,
      }
    },
    [pathname]
  )

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()
    const slug = listSlug

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
    setSourceInventory(null)
    setTotalArticleCount(null)
    setHasMore(true)
    ;(async () => {
      logNewsOverview('feed_session_start', {
        pagePath: pathname,
        list: slug,
        facet: facetLabelForLog(tagFilter),
      })
      const idbKey = buildNewsFeedOverviewIdbKey(slug, PAGE_SIZE, tagFilter)
      let hydratedFromIdb = false
      try {
        const cached = await getNewsFeedOverviewFromIdb(idbKey)
        if (!cancelled && slug === listSlugRef.current && cached) {
          setItems(cached.items)
          setHasMore(cached.hasMore)
          setPartialErrors(cached.errors)
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
          setLoading(false)
          hydratedFromIdb = true
          logNewsOverview('feed_idb_hit', {
            pagePath: pathname,
            list: slug,
            facet: facetLabelForLog(tagFilter),
            idbKey,
            itemsCount: cached.items.length,
          })
        }
      } catch {
        // IndexedDB unavailable or corrupt — fall through to network
      }

      try {
        const result = await fetchFeedPage(slug, 0, {
          signal: ac.signal,
          listTagFilter: tagFilter,
          requestIntent: 'initial',
        })
        if (cancelled || slug !== listSlugRef.current) {
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
        if (result.code === undefined || result.code === 0) {
          try {
            await setNewsFeedOverviewInIdb(idbKey, {
              items: result.list,
              errors: result.errors,
              fetchedAt: result.fetchedAt,
              facets: result.facets ?? null,
              sourceInventory: result.sourceInventory ?? null,
              uniqueAfterDedupe: result.uniqueAfterDedupe ?? null,
              hasMore: result.hasMore,
            })
          } catch {
            // ignore IDB write failures
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        if (!hydratedFromIdb && !cancelled && slug === listSlugRef.current) {
          setItems([])
          setFeedFacets(null)
          setSourceInventory(null)
          setTotalArticleCount(null)
          setError(e instanceof Error ? e.message : 'Failed to load')
          setHasMore(false)
        }
      } finally {
        if (!cancelled && slug === listSlugRef.current && !hydratedFromIdb) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [listSlug, fetchFeedPage, tagFilter, pathname])

  /**
   * Clear sidebar facet and drop facet params from the URL (same list).
   */
  function clearTagFilterAndReload() {
    replaceOverviewUrl({ listSlug: listSlugRef.current, tagFilter: null })
  }

  useEffect(() => {
    loadMoreRef.current = async () => {
      if (loading || loadingMore || !hasMore || loadMoreInFlightRef.current) {
        return
      }
      const slug = listSlugRef.current
      const offset = itemsRef.current.length
      if (offset === 0) {
        return
      }
      loadMoreInFlightRef.current = true
      setLoadingMore(true)
      logNewsOverview('load_more_trigger', {
        pagePath: pathname,
        list: slug,
        offset,
        facet: facetLabelForLog(tagFilterRef.current),
      })
      try {
        const result = await fetchFeedPage(slug, offset, {
          feedAnchor: feedSessionAnchorRef.current ?? undefined,
          listTagFilter: tagFilterRef.current,
          requestIntent: 'load_more',
        })
        if (slug !== listSlugRef.current) {
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
  }, [hasMore, loading, loadingMore, listSlug, items.length])

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
  }, [listSlug, tagFilter])

  function scrollArticleListToTop() {
    scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <header className="flex shrink-0 min-w-0 flex-nowrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-gray-900">News</h1>
          <p className="mt-0.5 line-clamp-2 text-xs leading-tight text-gray-500">Aggregated feeds — pick a channel from the menu.</p>
        </div>
        <div className="ml-auto w-[11rem] shrink-0 sm:w-[14rem]">
          <label htmlFor="news-overview-list" className="sr-only">
            频道
          </label>
          <DropdownSelect
            id="news-overview-list"
            ariaLabel="选择新闻频道"
            value={listSlug}
            onChange={(nextRaw) => {
              const next = normalizeNewsListSlug(nextRaw)
              const cur = tagFilterRef.current
              // Drop `source=` when changing channel (manifest source ids are per-list); keep tag/keyword facets.
              const nextFacet = cur?.kind === 'src' ? null : cur
              replaceOverviewUrl({ listSlug: next, tagFilter: nextFacet })
            }}
            options={channelOptions}
            wrapperClassName="w-full"
            align="end"
          />
        </div>
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
                <EmptyState icon={<TbNews className="h-12 w-12 text-gray-400/30 opacity-70" />} message="No articles yet" />
              </div>
            ) : null}

            {!loading && items.length > 0 ? (
              <ul className="mx-auto max-w-3xl shrink-0 space-y-3" aria-label="Article list">
                {items.map((item, idx) => {
                  const desc = plainTextFromHtml(item.summary ?? '')
                  const regionHint = item.region === 'cn' ? 'Mainland CN' : item.region === 'hk_tw' ? 'HK & TW' : 'International'
                  const fallbackDesc = !desc ? `${item.sourceLabel} · ${regionHint}` : desc
                  const when = formatPublished(item.publishedAt)
                  const also = item.alsoFromSources ?? []
                  const facetSrcId = tagFilter?.kind === 'src' ? tagFilter.sourceId : null
                  const summaryRowKey = `${item.sourceId}-${item.link}-${item.publishedAt ?? ''}-${idx}`
                  const summaryNeedsExpand = fallbackDesc.length > SUMMARY_EXPAND_THRESHOLD_CHARS
                  const summaryExpanded = Boolean(expandedSummaryKeys[summaryRowKey])
                  return (
                    <li key={summaryRowKey}>
                      <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[15px] font-semibold leading-snug text-gray-900 underline-offset-2 hover:text-blue-700 hover:underline"
                        >
                          {item.title}
                        </a>
                        {item.imageUrl?.trim() ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block overflow-hidden rounded-lg ring-1 ring-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                            aria-label={`${item.title} — illustration`}
                          >
                            <div className="relative h-48 w-full bg-gray-100">
                              <LazyImage src={item.imageUrl.trim()} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                            </div>
                          </a>
                        ) : null}
                        {item.feedCategories && item.feedCategories.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${RSS_TAG_LABEL} (filter)`}>
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
                                  title={`Tag: ${fc}`}
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
                        {also.length > 0 ? (
                          <div
                            className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-[10px] leading-snug text-gray-500"
                            role="group"
                            aria-label="Same story, other outlets (merged by link or same-day title)"
                          >
                            <span className="shrink-0 font-medium text-gray-400">Also</span>
                            {also.map((ref, j) => {
                              const matchesFacet = facetSrcId !== null && ref.sourceId === facetSrcId
                              const inner = <span className={matchesFacet ? 'font-semibold text-violet-700' : undefined}>{ref.sourceLabel}</span>
                              return (
                                <span key={`${ref.sourceId}-${j}`} className="inline-flex min-w-0 items-baseline gap-1">
                                  {j > 0 ? (
                                    <span className="text-gray-300" aria-hidden>
                                      {'\u00b7'}
                                    </span>
                                  ) : null}
                                  {ref.href ? (
                                    <a
                                      href={ref.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`min-w-0 truncate underline-offset-2 hover:underline ${matchesFacet ? 'text-violet-700' : 'text-gray-600 hover:text-gray-800'}`}
                                    >
                                      {inner}
                                    </a>
                                  ) : (
                                    inner
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        ) : null}
                        <div className="mt-2">
                          <p
                            id={`news-summary-body-${idx}`}
                            className={`break-words text-[13px] leading-relaxed text-gray-600 [overflow-wrap:anywhere] ${
                              summaryNeedsExpand && !summaryExpanded ? 'line-clamp-6' : ''
                            }`}
                          >
                            {fallbackDesc}
                          </p>
                          {summaryNeedsExpand ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="xs"
                              className="mt-1.5 justify-start"
                              aria-expanded={summaryExpanded}
                              aria-controls={`news-summary-body-${idx}`}
                              id={`news-summary-toggle-${idx}`}
                              onClick={() => {
                                setExpandedSummaryKeys((prev) => {
                                  const next = { ...prev }
                                  if (next[summaryRowKey]) {
                                    delete next[summaryRowKey]
                                  } else {
                                    next[summaryRowKey] = true
                                  }
                                  return next
                                })
                              }}
                            >
                              {summaryExpanded ? '收起' : '展开'}
                            </Button>
                          ) : null}
                        </div>
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
                End of the list.
              </p>
            ) : null}

            {!loading && partialErrors.length > 0 ? (
              <p className="mx-auto mt-4 max-w-3xl text-[11px] text-amber-800">
                Some sources failed ({partialErrors.length}): {partialErrors.map((e) => e.sourceId).join(', ')}
              </p>
            ) : null}
          </div>

          {showBackToTop ? (
            <button
              type="button"
              className="absolute bottom-5 right-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              onClick={scrollArticleListToTop}
              aria-label="Back to top"
            >
              <TbArrowUp className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>

        <aside
          className="flex min-h-0 w-[9.25rem] min-w-0 shrink-0 grow-0 flex-col overflow-hidden border-l border-gray-200 bg-white sm:w-36 lg:w-[13.5rem] xl:w-60"
          aria-label={`Sources, keywords, and ${RSS_TAG_LABEL}`}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
            {showSourceSidebar ? (
              <section>
                <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700/90">Sources</h2>
                <div className="flex flex-col gap-1">
                  {sourceSidebarRows.map(({ sourceId, label, siteUrl, poolCount, parsedCount }) => {
                    const on = tagFilter?.kind === 'src' && tagFilter.sourceId === sourceId
                    const hasPool = poolCount > 0
                    const fetchError = partialErrorBySourceId.get(sourceId)
                    const idleVisual = hasPool
                      ? 'border border-violet-200/90 bg-violet-50/90 text-violet-950 hover:bg-violet-100'
                      : 'border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100/90'
                    const countLabel = sourceSidebarCountLabel(poolCount, parsedCount)
                    return (
                      <button
                        key={`src-${sourceId}`}
                        type="button"
                        onClick={() => {
                          const slug = listSlugRef.current
                          if (on) {
                            replaceOverviewUrl({ listSlug: slug, tagFilter: null })
                          } else {
                            replaceOverviewUrl({
                              listSlug: slug,
                              tagFilter: { kind: 'src', sourceId },
                            })
                          }
                        }}
                        className={`flex w-full max-w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
                          on ? 'bg-violet-700 text-white' : idleVisual
                        }`}
                        title={sourceSidebarRowTitle({ label, siteUrl, poolCount, parsedCount, fetchError })}
                      >
                        <span className="min-w-0 truncate font-medium">{label}</span>
                        <span className={`shrink-0 tabular-nums ${on ? 'text-violet-100' : hasPool ? 'text-violet-700/90' : 'text-gray-400'}`}>{countLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {showKeywordSidebar ? (
              <section>
                <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700/90">Keywords</h2>
                <div className="flex flex-col gap-1">
                  {tagSidebar.keywords.map(({ value, count }) => {
                    const on = tagFilter?.kind === 'fk' && tagFilter.value === value
                    return (
                      <button
                        key={`fk-${value}`}
                        type="button"
                        onClick={() => {
                          const slug = listSlugRef.current
                          if (on) {
                            replaceOverviewUrl({ listSlug: slug, tagFilter: null })
                          } else {
                            replaceOverviewUrl({
                              listSlug: slug,
                              tagFilter: { kind: 'fk', value },
                            })
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

            {showCategorySidebar ? (
              <section>
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
          </div>
          <div className="shrink-0 border-t border-gray-100 p-2">
            <button
              type="button"
              disabled={!tagFilter}
              onClick={clearTagFilterAndReload}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Clear filters
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
              <span className="font-semibold tabular-nums text-gray-800">{totalArticleCount}</span> in this channel
              {items.length > 0 && items.length < totalArticleCount ? (
                <>
                  {' '}
                  · <span className="tabular-nums">{items.length}</span> loaded
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

import { logNewsOverview, parseNewsPoolCacheFromHeader } from '@/app/news/lib/news-overview-client-log'
import type { NewsOverviewFeedEnvelope } from '@/app/news/lib/news-overview-feed-envelope'
import { NEWS_OVERVIEW_PAGE_SIZE, newsOverviewFacetLabelForLog, type NewsOverviewTagFilter } from '@/app/news/lib/news-overview-ui'
import { normalizeNewsListSlug } from '@/services/news/config/news-subcategories'
import type { AggregatedNewsItem, NewsFeedFacets, NewsFeedSourceInventoryRow } from '@/services/news/types'

/** Intent label for client logging and server-facing request shape. */
export type NewsOverviewFeedRequestIntent = 'initial' | 'load_more' | 'warmup_poll' | 'warmup_manual'

/**
 * Options for {@link fetchNewsOverviewFeedPage}.
 */
export type NewsOverviewFetchFeedPageOptions = {
  signal?: AbortSignal
  feedAnchor?: string
  listTagFilter?: NewsOverviewTagFilter
  requestIntent?: NewsOverviewFeedRequestIntent
  /** Re-fetch only these manifest source ids (first page; server merges into L1/L2). */
  retrySourceIds?: string[]
}

/**
 * Successful JSON envelope parse for a feed page request.
 */
export type NewsOverviewFeedPageSuccess = {
  ok: true
  list: AggregatedNewsItem[]
  hasMore: boolean
  errors: { sourceId: string; message: string }[]
  code?: number
  message?: string
  fetchedAt?: string
  facets?: NewsFeedFacets
  uniqueAfterDedupe?: number
  sourceInventory?: NewsFeedSourceInventoryRow[]
  feedWarmupSources: { sourceId: string; message: string }[]
}

/**
 * Transport or parse failure (non-OK HTTP or invalid JSON).
 */
export type NewsOverviewFeedPageFailure = {
  ok: false
  status: number
  text: string
}

/**
 * Result of {@link fetchNewsOverviewFeedPage}.
 */
export type NewsOverviewFeedPageResult = NewsOverviewFeedPageSuccess | NewsOverviewFeedPageFailure

/**
 * Fetch one page of the aggregated news feed for the overview client (logging + JSON parse).
 * @param pathname Current pathname for structured logs
 * @param slug List slug (normalized before query)
 * @param offset Merge pool skip
 * @param options Abort signal, facets, anchor, intent, optional retry source ids
 * @returns Parsed list payload or HTTP/JSON failure
 */
export async function fetchNewsOverviewFeedPage(pathname: string, slug: string, offset: number, options?: NewsOverviewFetchFeedPageOptions): Promise<NewsOverviewFeedPageResult> {
  const listNorm = normalizeNewsListSlug(slug)
  const q = new URLSearchParams({
    list: listNorm,
    limit: String(NEWS_OVERVIEW_PAGE_SIZE),
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
  const retryIds = options?.retrySourceIds
  if (retryIds !== undefined && retryIds.length > 0 && offset === 0) {
    q.set('retrySourceIds', retryIds.join(','))
  }
  const queryString = q.toString()
  const apiPath = `/api/news/feed?${queryString}`
  const intent = options?.requestIntent ?? 'initial'
  logNewsOverview('feed_request', {
    intent,
    pagePath: pathname,
    list: listNorm,
    offset,
    pageSize: NEWS_OVERVIEW_PAGE_SIZE,
    facet: newsOverviewFacetLabelForLog(lt ?? null),
    feedAnchor: offset > 0 && options?.feedAnchor ? options.feedAnchor.slice(0, 40) : null,
    retrySourceIds: options?.retrySourceIds?.length ? options.retrySourceIds : null,
    apiPath,
  })
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  let res: Response
  try {
    res = await fetch(apiPath, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
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
  let parsed: NewsOverviewFeedEnvelope
  try {
    parsed = JSON.parse(text) as NewsOverviewFeedEnvelope
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
  const feedWarmupSrc = data?.feedWarmup?.pending === true && Array.isArray(data.feedWarmup.sources) ? data.feedWarmup.sources : []
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
    feedWarmupSources: feedWarmupSrc.length,
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
    feedWarmupSources: feedWarmupSrc,
  }
}

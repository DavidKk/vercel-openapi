/**
 * Client-only helpers for `/news` overview diagnostics (browser console).
 * Enable in production via `NEXT_PUBLIC_NEWS_CLIENT_LOG=1` or `localStorage.setItem('news_debug','1')` + reload.
 */

const STORAGE_KEY = 'news_debug'

/** Default one-line explanation per event id (browser console). */
const DEFAULT_NEWS_OVERVIEW_LOG_MESSAGES: Record<string, string> = {
  router_replace: 'Overview: URL updated (tab or facet change).',
  route_sync: 'Overview: synced tab/facet from URL (back/forward or shared link).',
  feed_request: 'Overview: calling /api/news/feed.',
  feed_aborted: 'Overview: feed request aborted (navigation or cleanup).',
  feed_network_error: 'Overview: feed request failed before HTTP response.',
  feed_http_error: 'Overview: feed API returned an error status.',
  feed_json_error: 'Overview: feed response was not valid JSON.',
  feed_response: 'Overview: received a feed page from the API.',
  feed_envelope_error: 'Overview: feed JSON envelope reports failure (non-zero code).',
  feed_session_start: 'Overview: starting a new feed session (first page).',
  load_more_trigger: 'Overview: infinite scroll requested the next page.',
}

/**
 * Whether the news overview should print structured `console.info` lines.
 * @returns True in development, or when env / localStorage opt-in is set
 */
export function isNewsOverviewClientLogEnabled(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  if (process.env.NEXT_PUBLIC_NEWS_CLIENT_LOG === '1') {
    return true
  }
  if (typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_KEY) === '1') {
    return true
  }
  return false
}

/**
 * Emit one structured log line (prefix `[news:overview]` for DevTools filtering).
 * Adds `flow`, `message` (human-readable) unless `data.message` is already set.
 * @param event Short event id (e.g. `feed_request`, `feed_response`)
 * @param data Serializable payload
 */
export function logNewsOverview(event: string, data: Record<string, unknown>): void {
  if (!isNewsOverviewClientLogEnabled()) {
    return
  }
  const defaultMsg = DEFAULT_NEWS_OVERVIEW_LOG_MESSAGES[event] ?? `Overview: ${event}`
  const message = typeof data.message === 'string' && data.message.trim() !== '' ? data.message.trim() : defaultMsg
  const payload: Record<string, unknown> = {
    flow: '/news overview (browser)',
    ...data,
    message,
  }
  // eslint-disable-next-line no-console -- opt-in browser diagnostics
  console.info(`[news:overview] ${event} — ${message}`, payload)
}

/**
 * Map API `X-Cache-Hit` to explicit pool cache fields for logs.
 * @param header Value of `X-Cache-Hit` or null when absent (merged pool miss → full RSS path).
 * @returns Structured cache flags
 */
export function parseNewsPoolCacheFromHeader(header: string | null): {
  poolCacheHit: boolean
  poolCacheLayer: 'L1' | 'L2' | null
  rawXCacheHit: string | null
} {
  if (header === null || header.trim() === '') {
    return { poolCacheHit: false, poolCacheLayer: null, rawXCacheHit: null }
  }
  const t = header.trim().toUpperCase()
  if (t === 'L1') {
    return { poolCacheHit: true, poolCacheLayer: 'L1', rawXCacheHit: header }
  }
  if (t === 'L2') {
    return { poolCacheHit: true, poolCacheLayer: 'L2', rawXCacheHit: header }
  }
  return { poolCacheHit: true, poolCacheLayer: null, rawXCacheHit: header }
}

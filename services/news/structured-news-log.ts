import type { ModuleLogger } from '@/services/logger'

/** Flow label for GET /api/news/feed structured logs */
export const NEWS_FEED_API_FLOW = 'GET /api/news/feed'

/** Flow label for RSS merge inside `mergeNewsFeedsToPool` */
export const NEWS_RSS_MERGE_FLOW = 'News merged pool'

/** Flow label for GET /api/news/sources */
export const NEWS_SOURCES_API_FLOW = 'GET /api/news/sources'

/** Flow label for `/news` root (redirect) */
export const NEWS_PAGE_ROOT_FLOW = 'Page /news'

/** Flow label for `/news/[slug]` list shell */
export const NEWS_PAGE_LIST_FLOW = 'Page /news/[slug]'

type NewsStructuredLevel = 'info' | 'ok' | 'warn' | 'fail'

/**
 * Emit one structured news log line: human-readable message plus JSON detail (`flow`, `event`, and extra fields).
 * Omits a separate `step` field; `event` is the stable identifier for aggregation.
 * @param logger Module logger (e.g. api-news-feed)
 * @param level Log level
 * @param flow Stable flow name (see exported flow constants)
 * @param message Short human-readable summary (MESSAGE)
 * @param event Stable event id (e.g. `news_feed_response`)
 * @param detail Additional JSON fields merged after `flow` and `event`
 */
export function logNewsStructured(logger: ModuleLogger, level: NewsStructuredLevel, flow: string, message: string, event: string, detail: Record<string, unknown>): void {
  const json = JSON.stringify({ flow, event, ...detail })
  if (level === 'info') {
    logger.info(message, json)
    return
  }
  if (level === 'ok') {
    logger.ok(message, json)
    return
  }
  if (level === 'warn') {
    logger.warn(message, json)
    return
  }
  logger.fail(message, json)
}

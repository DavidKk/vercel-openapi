import { NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE } from './aggregate-feed'

/**
 * Upstream issue class for one RSS source: still loading / transient vs hard failure.
 */
export type NewsFeedSourceIssueKind = 'warming' | 'failure'

/** Suggested client poll interval (seconds) after `feedWarmup` is present. */
export const NEWS_FEED_WARMUP_POLL_INTERVAL_SECONDS = 5

/** Seconds before the UI may offer a manual retry for the same warmup set. */
export const NEWS_FEED_WARMUP_MANUAL_UNLOCK_SECONDS = 5

/**
 * Classify a pool error message as transient warm-up (timeouts, merge cap, retryable HTTP) or a hard failure.
 * @param message Error text from RSS merge / fetch
 * @returns `warming` when the client should poll `retrySourceIds`; `failure` when shown as a source error
 */
export function classifyNewsFeedSourceIssueMessage(message: string): NewsFeedSourceIssueKind {
  const m = message.trim()
  if (m.includes(NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE) || m.startsWith('skipped:')) {
    return 'warming'
  }
  if (/timeout after \d+ms/i.test(m) || m.toLowerCase().includes('timeout after')) {
    return 'warming'
  }
  if (m.includes('exhausted retries')) {
    return 'warming'
  }
  const httpMatch = /HTTP (\d{3})\b/.exec(m)
  if (httpMatch) {
    const code = Number.parseInt(httpMatch[1], 10)
    if (code === 429 || code === 502 || code === 503 || code === 504) {
      return 'warming'
    }
    return 'failure'
  }
  if (/\btimeout\b/i.test(m)) {
    return 'warming'
  }
  return 'failure'
}

/**
 * Split pooled per-source errors into warm-up rows vs hard failures for API consumers.
 * @param errors Rows from merged pool `errors`
 * @returns Two lists (same shape as input rows)
 */
export function splitNewsFeedPoolErrors(errors: readonly { sourceId: string; message: string }[] | undefined): {
  warmup: { sourceId: string; message: string }[]
  failures: { sourceId: string; message: string }[]
} {
  if (errors === undefined || errors.length === 0) {
    return { warmup: [], failures: [] }
  }
  const warmup: { sourceId: string; message: string }[] = []
  const failures: { sourceId: string; message: string }[] = []
  for (const e of errors) {
    if (classifyNewsFeedSourceIssueMessage(e.message) === 'warming') {
      warmup.push(e)
    } else {
      failures.push(e)
    }
  }
  return { warmup, failures }
}

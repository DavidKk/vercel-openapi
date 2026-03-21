import type { AggregatedNewsItem } from './types'

/** Default rolling window for “recent” news (avoids empty lists right after local midnight). */
const DEFAULT_RECENT_HOURS = 24

/** Lower bound for any recent-window length (hours). */
export const MIN_RECENT_HOURS = 1

/** Upper bound for any recent-window length (hours). */
export const MAX_RECENT_HOURS = 168

const RECENT_HOURS_ENV = 'NEWS_FEED_RECENT_HOURS'

/**
 * Per flat list slug (`/news/[slug]`, `?list=`): hours to keep items by `publishedAt`.
 * Headlines stay short; opinion/science cover weekly or slow RSS; tech `media` tolerates cross-region lag.
 */
const LIST_SLUG_RECENT_HOURS: Readonly<Record<string, number>> = {
  headlines: 24,
  opinion: 168,
  media: 72,
  developer: 48,
  product: 48,
  games: 96,
  stem: 168,
}

/**
 * Rolling window length (hours) for keeping feed items by `publishedAt`.
 * @returns Clamped integer between 1 and 168; default 24
 */
export function getNewsFeedRecentWindowHours(): number {
  const raw = process.env[RECENT_HOURS_ENV]?.trim()
  if (!raw) {
    return DEFAULT_RECENT_HOURS
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return DEFAULT_RECENT_HOURS
  }
  return Math.min(MAX_RECENT_HOURS, Math.max(MIN_RECENT_HOURS, n))
}

/**
 * Rolling-window length for one merged pool: {@link getNewsFeedRecentWindowHours} when there is no list dimension
 * (all-pool); otherwise the per-slug default from {@link LIST_SLUG_RECENT_HOURS}, clamped.
 * @param listSlug Flat list key or empty string for the no-list / all-category pool
 * @returns Hours between {@link MIN_RECENT_HOURS} and {@link MAX_RECENT_HOURS}
 */
export function getNewsFeedRecentWindowHoursForListSlug(listSlug: string): number {
  const t = listSlug?.trim() ?? ''
  if (t === '') {
    return getNewsFeedRecentWindowHours()
  }
  const mapped = LIST_SLUG_RECENT_HOURS[t]
  const hours = mapped !== undefined ? mapped : getNewsFeedRecentWindowHours()
  return Math.min(MAX_RECENT_HOURS, Math.max(MIN_RECENT_HOURS, hours))
}

/**
 * Whether `publishedAt` is within the last `windowHours` hours (inclusive of lower bound).
 * Missing or **unparseable** `publishedAt` is treated as **in window**: many RSSHub routes omit `pubDate` or emit
 * non-ISO strings; dropping those rows produced `parsedCount > 0` but `poolCount = 0` in source inventory.
 * @param publishedAt RSS `pubDate` ISO string or null
 * @param windowHours Rolling window length in hours
 * @param nowMs Reference “now” in epoch ms (for tests)
 * @returns True when absent/unparseable, or when timestamp parses and is >= now - window
 */
export function isPublishedWithinRecentWindow(publishedAt: string | null, windowHours: number, nowMs: number = Date.now()): boolean {
  if (!publishedAt) {
    return true
  }
  const t = Date.parse(publishedAt)
  if (Number.isNaN(t)) {
    return true
  }
  const windowMs = windowHours * 60 * 60 * 1000
  const threshold = nowMs - windowMs
  return t >= threshold
}

/**
 * Keep items whose `publishedAt` is inside the rolling window, **missing**, or **unparseable** (unknown time); drop only parsed timestamps older than the window.
 * @param items Sorted/deduped rows
 * @param windowHours Rolling window length in hours
 * @param nowMs Reference “now” (for tests)
 * @returns Kept rows and how many were removed
 */
export function filterToRecentPublished(
  items: AggregatedNewsItem[],
  windowHours: number,
  nowMs: number = Date.now()
): { kept: AggregatedNewsItem[]; droppedOutsideRecentWindow: number } {
  const kept = items.filter((row) => isPublishedWithinRecentWindow(row.publishedAt, windowHours, nowMs))
  return { kept, droppedOutsideRecentWindow: items.length - kept.length }
}

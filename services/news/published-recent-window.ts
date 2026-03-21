import type { AggregatedNewsItem } from './types'

/** Default rolling window for “recent” news (avoids empty lists right after local midnight). */
const DEFAULT_RECENT_HOURS = 24

const MIN_RECENT_HOURS = 1

const MAX_RECENT_HOURS = 168

const RECENT_HOURS_ENV = 'NEWS_FEED_RECENT_HOURS'

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
 * Whether `publishedAt` is within the last `windowHours` hours (inclusive of lower bound).
 * @param publishedAt RSS `pubDate` ISO string or null
 * @param windowHours Rolling window length in hours
 * @param nowMs Reference “now” in epoch ms (for tests)
 * @returns True when timestamp parses and is >= now - window
 */
export function isPublishedWithinRecentWindow(publishedAt: string | null, windowHours: number, nowMs: number = Date.now()): boolean {
  if (!publishedAt) {
    return false
  }
  const t = Date.parse(publishedAt)
  if (Number.isNaN(t)) {
    return false
  }
  const windowMs = windowHours * 60 * 60 * 1000
  const threshold = nowMs - windowMs
  return t >= threshold
}

/**
 * Keep only items whose `publishedAt` falls inside the rolling window; drop the rest.
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

import { normalizeNewsListSlug } from '@/services/news/config/news-subcategories'
import type { NewsFacetListFilter } from '@/services/news/facets/facet-list-filter'
import type { NewsFeedFacets } from '@/services/news/types'

/** Page size for `/api/news/feed` (infinite scroll loads additional pages with `offset`). */
export const NEWS_OVERVIEW_PAGE_SIZE = 20

/**
 * Default merged RSS source cap when `/api/news/feed` omits `maxFeeds` (keep in sync with that route).
 */
export const NEWS_OVERVIEW_DEFAULT_FEED_MAX_SOURCES = 15

/**
 * Show a sidebar group when `distinctOptions.length` is **greater** than this (`0` → show if any option exists).
 */
export const NEWS_OVERVIEW_SIDEBAR_TAG_GROUP_SHOW_WHEN_LENGTH_EXCEEDS = 0

/** Max topic rows shown in the Topics sidebar (pool histogram, count desc). */
export const NEWS_OVERVIEW_TOPIC_SIDEBAR_DISPLAY_LIMIT = 10

/**
 * Card chip group: RSS `feedCategories` (still maps to `tag` / `feedCategory` when used as a filter).
 */
export const NEWS_OVERVIEW_RSS_TAG_LABEL = 'Tags'

/** Merged sidebar section: RSS categories + keywords in one list */
export const NEWS_OVERVIEW_TOPICS_SIDEBAR_LABEL = 'Topics'

/** Cap chips under each title so dense RSS category lists do not stretch cards. */
export const NEWS_OVERVIEW_MAX_RSS_SECTION_CHIPS_PER_CARD = 8

/**
 * Plain-text summary length above which the card shows a line-clamped preview until the user expands.
 */
export const NEWS_OVERVIEW_SUMMARY_EXPAND_THRESHOLD_CHARS = 320

/** Show the list “back to top” control after scrolling this many pixels inside the article column. */
export const NEWS_OVERVIEW_BACK_TO_TOP_SCROLL_THRESHOLD_PX = 240

/** One merged topic row: RSS category (`fc`) or keyword (`fk`) after pool aggregation */
export interface NewsOverviewTopicFacetRow {
  value: string
  count: number
  /** Prefer `fk` when the same label exists as both category and keyword */
  facetKind: 'fc' | 'fk'
}

/**
 * Sidebar list: top {@link NEWS_OVERVIEW_TOPIC_SIDEBAR_DISPLAY_LIMIT} topic rows from the pool histogram (count descending).
 */
export interface NewsOverviewTopicSidebarBuckets {
  main: NewsOverviewTopicFacetRow[]
}

export const NEWS_OVERVIEW_EMPTY_TOPIC_SIDEBAR: NewsOverviewTopicSidebarBuckets = {
  main: [],
}

/** Sidebar tag filter: null or facet passed to `/api/news/feed` for server-side list filtering before pagination */
export type NewsOverviewTagFilter = NewsFacetListFilter | null

/**
 * Build the Topics sidebar rows from API facet histograms (keyword union only; avoids double-counting categories).
 * @param feedFacets Pool histograms from `GET /api/news/feed`, or null before first load
 * @returns Buckets for the sidebar (capped)
 */
export function buildNewsOverviewTopicSidebar(feedFacets: NewsFeedFacets | null): NewsOverviewTopicSidebarBuckets {
  if (!feedFacets) {
    return NEWS_OVERVIEW_EMPTY_TOPIC_SIDEBAR
  }
  const rows: NewsOverviewTopicFacetRow[] = feedFacets.keywords
    .filter((r) => r.count >= 1)
    .map((r) => ({
      value: r.value,
      count: r.count,
      facetKind: 'fk' as const,
    }))
  rows.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
  return {
    main: rows.slice(0, NEWS_OVERVIEW_TOPIC_SIDEBAR_DISPLAY_LIMIT),
  }
}

/**
 * Sidebar count as `pool/raw`: merged-list citations vs latest RSS parse size.
 * @param poolCount Rows in the merged pool that cite this outlet (headline or same-story merge)
 * @param parsedCount Items parsed from RSS for this source on the last fetch
 * @returns Compact label, e.g. `1/50` or `0`
 */
export function newsOverviewSourceSidebarCountLabel(poolCount: number, parsedCount: number): string {
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
export function newsOverviewSourceSidebarRowTitle(parts: { label: string; siteUrl: string; poolCount: number; parsedCount: number; fetchError?: string }): string {
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
export function newsOverviewListSlugFromRouteParam(slug: string | string[] | undefined): string {
  const raw = Array.isArray(slug) ? slug[0] : slug
  return normalizeNewsListSlug(raw ?? undefined)
}

/**
 * Compact facet description for client logs (avoid huge strings).
 * @param lt Active list filter or null
 * @returns Short label or null
 */
export function newsOverviewFacetLabelForLog(lt: NewsOverviewTagFilter): string | null {
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
export function newsOverviewPlainTextFromHtml(html: string): string {
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
export function newsOverviewFormatPublished(iso: string | null): string {
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
export function newsOverviewMergePartialErrors(
  prev: { sourceId: string; message: string }[],
  next: { sourceId: string; message: string }[]
): { sourceId: string; message: string }[] {
  const map = new Map(prev.map((e) => [e.sourceId, e]))
  for (const e of next) {
    map.set(e.sourceId, e)
  }
  return [...map.values()]
}

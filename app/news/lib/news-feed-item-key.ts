import type { AggregatedNewsItem } from '@/services/news/types'

/**
 * FNV-1a 32-bit hash for short DOM id suffixes (avoids unstable or overlong `id` attributes).
 * @param s Input string
 * @returns Lowercase base-36 token
 */
function fnv1a32Base36(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Stable React list key for a merged feed row: normalized title (primary for reconciliation) plus link and source so same title from different URLs stays distinct.
 * @param item Aggregated news row
 * @returns Stable string key
 */
export function getNewsFeedItemListKey(item: Pick<AggregatedNewsItem, 'title' | 'link' | 'sourceId'>): string {
  const t = item.title.trim().toLowerCase().replace(/\s+/g, ' ')
  const u = item.link.trim()
  return `${item.sourceId}:${t}:${u}`
}

/**
 * Short suffix for `id` / `aria-controls` derived from {@link getNewsFeedItemListKey}.
 * @param listKey Value from {@link getNewsFeedItemListKey}
 * @returns DOM-safe short token
 */
export function getNewsFeedItemDomSuffix(listKey: string): string {
  return fnv1a32Base36(listKey)
}

/**
 * Builds a parallel array of unique React list keys when `items` contains multiple rows with the same
 * {@link getNewsFeedItemListKey} (duplicate merge rows from the API). The first occurrence keeps the base key;
 * later occurrences append `#__dupN` where `N` is the 1-based duplicate index.
 * @param items Feed rows in render order
 * @returns Same length as `items`; each entry is a unique string suitable for `key={...}`
 */
export function getNewsFeedItemRowKeys(items: AggregatedNewsItem[]): string[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const base = getNewsFeedItemListKey(item)
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return n === 0 ? base : `${base}#__dup${n}`
  })
}

/**
 * Merge the server’s latest first page into the current list: **new** rows (by list key) are prepended so the
 * window’s newest items surface first; existing order is preserved for the tail.
 * @param previous Rows already shown (may include load-more tail)
 * @param incomingHead First-page slice from the API (`offset=0`)
 * @returns Merged list and keys that were newly prepended (for enter animation)
 */
export function mergeNewsFeedItemsPreferIncomingHead(
  previous: AggregatedNewsItem[],
  incomingHead: AggregatedNewsItem[]
): { merged: AggregatedNewsItem[]; prependedKeys: string[] } {
  const prevKeys = new Set(previous.map((x) => getNewsFeedItemListKey(x)))
  const prepended: AggregatedNewsItem[] = []
  const prependedKeys: string[] = []
  for (const item of incomingHead) {
    const key = getNewsFeedItemListKey(item)
    if (!prevKeys.has(key)) {
      prevKeys.add(key)
      prepended.push(item)
      prependedKeys.push(key)
    }
  }
  return { merged: [...prepended, ...previous], prependedKeys }
}

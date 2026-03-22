/**
 * RSS facet noise control: (1) static + env denylist, (2) a small ASCII closed-class word set for single-token English.
 */

import type { AggregatedNewsItem } from '../types'
import { dedupeFacetLabelListForItem } from './dedupe-facet-label-substrings'

const RSS_FACET_LABEL_DENYLIST = new Set<string>([
  '一号专案',
  '中国',
  '中國',
  '央视新闻',
  '央視新聞',
  '全球速报',
  '要闻',
  '头条',
  '快讯',
  '滚动',
  '新闻',
  '地方',
  '娱乐',
  '娛樂',
  '国际',
  '國際',
  '快看',
  '政治',
  '文化',
  '生活',
  '民生',
  '爆炸',
  '就业',
  '机组',
  '牛市点线面',
  '直击现场',
  '运动',
  '運動',
  '财经看点',
  '大国外交',
  '浦江头条',
  '暖闻湃',
  '魔都眼',
  '美国',
  '美國',
  '市场',
  '企业',
  '北方',
  '南方',
  '首都',
  '持续',
  '人才',
  '人口',
  '生态',
  '气温',
  '天气',
  '出口',
  '普法',
  '苹果日报',
  '香港',
  '我国',
])

/**
 * English labels matched case-insensitively when the label is ASCII-only (trimmed).
 * Multi-word phrases stored lowercase.
 */
const RSS_FACET_LABEL_DENYLIST_ASCII_LOWER = new Set<string>(['and', 'asia', 'culture', 'floods', 'for', 'new', 'the', 'top', 'united states', 'world'])

/**
 * Single-token ASCII labels that are articles / prepositions / auxiliaries — not useful as news facets.
 */
const ASCII_CLOSED_CLASS_FACET_WORDS = new Set<string>([
  'a',
  'an',
  'are',
  'as',
  'at',
  'be',
  'been',
  'being',
  'but',
  'by',
  'do',
  'does',
  'did',
  'for',
  'from',
  'had',
  'has',
  'have',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'onto',
  'or',
  'our',
  'out',
  'per',
  'so',
  'the',
  'to',
  'up',
  'us',
  'via',
  'was',
  'we',
  'were',
  'you',
])

/** Optional comma / newline–separated labels merged into the denylist (see `.env.example`). */
const ENV_EXTRA_DENYLIST = 'RSS_FACET_DENYLIST_EXTRA'

type DenylistSets = { exact: Set<string>; asciiLower: Set<string> }

let mergedDenylistCacheKey = ''
let mergedDenylistCache: DenylistSets | null = null

/**
 * Build static + `RSS_FACET_DENYLIST_EXTRA` denylist sets, cached until the env value changes.
 * @returns Merged exact-match (CJK / mixed) and ASCII-only lowercase sets
 */
function getDenylistSets(): DenylistSets {
  const raw = process.env[ENV_EXTRA_DENYLIST]?.trim() ?? ''
  if (raw === mergedDenylistCacheKey && mergedDenylistCache) {
    return mergedDenylistCache
  }
  const exact = new Set<string>(RSS_FACET_LABEL_DENYLIST)
  const asciiLower = new Set<string>(RSS_FACET_LABEL_DENYLIST_ASCII_LOWER)
  if (raw) {
    for (const part of raw.split(/[,，;；\n]/)) {
      const t = part.trim()
      if (!t) {
        continue
      }
      if (/^[\x00-\x7f]+$/.test(t)) {
        asciiLower.add(t.toLowerCase())
      } else {
        exact.add(t)
      }
    }
  }
  mergedDenylistCacheKey = raw
  mergedDenylistCache = { exact, asciiLower }
  return mergedDenylistCache
}

/**
 * Remove RSS-derived facet labels that are desk noise or obvious function words.
 * @param labels Trimmed or untrimmed strings from `feedCategories` / `feedKeywords`
 * @returns Labels that should be kept for facet aggregation
 */
export function filterRssFacetLabels(labels: string[]): string[] {
  const sets = getDenylistSets()
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of labels) {
    const t = raw.trim()
    if (!t || seen.has(t)) {
      continue
    }
    if (shouldDropRssFacetLabelWithSets(t, sets)) {
      continue
    }
    seen.add(t)
    out.push(t)
  }
  return out
}

/**
 * Whether a single label should be dropped before facet union.
 * @param trimmed Non-empty trimmed label
 * @returns True when the label should not appear in facets
 */
export function shouldDropRssFacetLabel(trimmed: string): boolean {
  return shouldDropRssFacetLabelWithSets(trimmed, getDenylistSets())
}

/**
 * Whether a label should drop given pre-built denylist sets (avoids re-parsing env in tight loops).
 * @param trimmed Non-empty trimmed label
 * @param sets Merged denylist from `getDenylistSets()`
 * @returns True when the label should not appear in facets
 */
function shouldDropRssFacetLabelWithSets(trimmed: string, sets: DenylistSets): boolean {
  if (sets.exact.has(trimmed)) {
    return true
  }
  if (/^[\x00-\x7f]+$/.test(trimmed)) {
    const lower = trimmed.toLowerCase()
    if (sets.asciiLower.has(lower)) {
      return true
    }
    if (shouldDropAsciiClosedClassFacetWord(lower)) {
      return true
    }
    return false
  }
  return false
}

/**
 * @param lower ASCII-only label, lowercased, no spaces
 * @returns True for articles / light function words unsuitable as keyword facets
 */
function shouldDropAsciiClosedClassFacetWord(lower: string): boolean {
  if (lower.includes(' ') || lower.length > 24) {
    return false
  }
  return ASCII_CLOSED_CLASS_FACET_WORDS.has(lower)
}

/**
 * Shallow-clone an item and drop denied strings from `feedCategories` / `feedKeywords` (API response / card chips).
 * @param item Merged news row (may contain legacy unfiltered labels from KV)
 * @returns Row with the same fields except stripped facet arrays
 */
export function stripRssFacetLabelsFromAggregatedItem(item: AggregatedNewsItem): AggregatedNewsItem {
  const next: AggregatedNewsItem = { ...item }
  if (item.feedCategories?.length) {
    const cats = dedupeFacetLabelListForItem(filterRssFacetLabels(item.feedCategories))
    if (cats.length > 0) {
      next.feedCategories = cats
    } else {
      delete next.feedCategories
    }
  }
  if (item.feedKeywords?.length) {
    const kws = dedupeFacetLabelListForItem(filterRssFacetLabels(item.feedKeywords))
    if (kws.length > 0) {
      next.feedKeywords = kws
    } else {
      delete next.feedKeywords
    }
  }
  return next
}

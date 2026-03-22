import type { AggregatedNewsItem } from '../types'
import { dedupeFacetLabelListForItem } from './dedupe-facet-label-substrings'
import { normalizeLabelForOutletMatch } from './facet-label-normalize'

/**
 * Taxonomy-only strings (SC/TC, channel tab copy, English list labels) that duplicate site categories / list slugs.
 * Exact normalized match only so specific topics like “人工智能” stay.
 */
const RAW_REDUNDANT_CATEGORY_TOPIC_LABELS: readonly string[] = [
  '新闻',
  '新聞',
  '资讯',
  '資訊',
  '科技',
  '游戏',
  '遊戲',
  '科学',
  '科學',
  '要闻',
  '要聞',
  '开发',
  '開發',
  '社区',
  '社區',
  '要闻速递',
  '科技资讯',
  '科技資訊',
  '开发社区',
  '開發社區',
  '产品工具',
  '產品工具',
  '游戏资讯',
  '遊戲資訊',
  '科学科普',
  '科學科普',
  'Headlines',
  'Tech media',
  'Dev & tech community',
  'Product & tools',
  'Gaming',
  'Science',
  'general-news',
  'tech-internet',
  'game-entertainment',
  'science-academic',
]

/** Lazily built normalized keys for {@link RAW_REDUNDANT_CATEGORY_TOPIC_LABELS}. */
let redundantCategoryTopicNormCache: ReadonlySet<string> | null = null

function getRedundantCategoryTopicNormalizedSet(): ReadonlySet<string> {
  if (!redundantCategoryTopicNormCache) {
    const s = new Set<string>()
    for (const raw of RAW_REDUNDANT_CATEGORY_TOPIC_LABELS) {
      const n = normalizeLabelForOutletMatch(raw)
      if (n) {
        s.add(n)
      }
    }
    redundantCategoryTopicNormCache = s
  }
  return redundantCategoryTopicNormCache
}

/**
 * Drop taxonomy-only labels from a list (preserves order and original spelling of kept entries).
 * @param labels Parsed `feedKeywords` or `feedCategories` entries
 * @returns Labels to keep
 */
export function stripRedundantCategoryLikeTopicLabels(labels: readonly string[]): string[] {
  const block = getRedundantCategoryTopicNormalizedSet()
  const out: string[] = []
  for (const raw of labels) {
    const k = raw.trim()
    if (!k) {
      continue
    }
    if (block.has(normalizeLabelForOutletMatch(k))) {
      continue
    }
    out.push(k)
  }
  return out
}

/**
 * Remove redundant taxonomy strings from `feedKeywords` and `feedCategories` in place (Topics union uses both).
 * @param item Aggregated news row
 */
export function stripRedundantCategoryLikeLabelsFromAggregatedItem(item: AggregatedNewsItem): void {
  if (item.feedKeywords?.length) {
    const next = dedupeFacetLabelListForItem(stripRedundantCategoryLikeTopicLabels(item.feedKeywords))
    if (next.length > 0) {
      item.feedKeywords = next
    } else {
      delete item.feedKeywords
    }
  }
  if (item.feedCategories?.length) {
    const next = dedupeFacetLabelListForItem(stripRedundantCategoryLikeTopicLabels(item.feedCategories))
    if (next.length > 0) {
      item.feedCategories = next
    } else {
      delete item.feedCategories
    }
  }
}

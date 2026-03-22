import { capItemFeedKeywordList } from '@/services/news/config/feed-keyword-budgets'
import type { AggregatedNewsItem } from '@/services/news/types'

import { dedupeFacetLabelListForItem } from './dedupe-facet-label-substrings'
import { filterRssFacetLabels } from './rss-facet-label-filter'
import { buildPlainDocumentForKeywordCheck, filterFeedKeywordsLiteralInPlain } from './rss-feed-keyword-document-match'
import { stripRedundantCategoryLikeTopicLabels } from './strip-redundant-topic-category-labels'

/** Hard-drop exact labels: time words, reporting glue, generic nouns, and obvious residue fragments. */
const HARD_FILTER_EXACT_DENYLIST = new Set([
  '今天',
  '近日',
  '近期',
  '目前',
  '如何',
  '哪些',
  '来源',
  '活动',
  '安全',
  '官方',
  '学者',
  '主席',
  '能力',
  '男子',
  '一次',
  '开局',
  '开幕式',
  '十五',
  '亿元',
  '中央社',
  '媒体报',
  '新华社报',
  '央视网消息',
  'images',
  'Images',
])
/** Leading action / framing verbs that make the whole phrase unsuitable as a final topic. */
const HARD_FILTER_PREFIXES = ['保持', '支持', '发表', '运用', '加大', '接受', '办理', '破获', '通报', '如何', '哪些']
/** Trailing action / residue tails that indicate the phrase is not a stable topic. */
const HARD_FILTER_SUFFIXES = ['出席', '正在', '主办', '消息', '来源', '今天', '近日', '近期', '目前']
/** If the bad head itself is unusable as a topic, longer phrases starting with it should also drop. */
const HARD_FILTER_BAD_HEADS = ['今天', '今年', '近日', '近期', '目前', '新华社报', '央视网消息', '中央社', '媒体报']

function shouldHardFilterCandidateTopic(raw: string): boolean {
  const label = raw.trim()
  if (!label) {
    return true
  }
  if (HARD_FILTER_EXACT_DENYLIST.has(label)) {
    return true
  }
  if (HARD_FILTER_BAD_HEADS.some((head) => label.startsWith(head) && label.length > head.length)) {
    return true
  }
  if (/^第[一二三四五六七八九十百千0-9]+届$/.test(label)) {
    return true
  }
  if (/^执行官[\u4e00-\u9fff]{1,4}$/.test(label)) {
    return true
  }
  if (HARD_FILTER_PREFIXES.some((prefix) => label.startsWith(prefix) && label.length > prefix.length)) {
    return true
  }
  if (HARD_FILTER_SUFFIXES.some((suffix) => label.endsWith(suffix) && label.length > suffix.length)) {
    return true
  }
  return false
}

function applyHardFilterToCandidateTopics(labels: string[]): string[] {
  return labels.filter((label) => !shouldHardFilterCandidateTopic(label))
}

/**
 * Final `feedKeywords` for API responses: RSS `media:keywords` only (trim/dedupe upstream),
 * literal-checked against title+summary, denylist/hard-filtered, redundant-taxonomy strip, then facet + cap.
 * No segmentation, statistical extraction, or Chinese suffix/prefix rewriting.
 * @param item Aggregated RSS row
 * @returns Final keyword list (empty when nothing survives)
 */
export function buildFinalFeedKeywordsForNewsItem(item: AggregatedNewsItem): string[] {
  const title = item.title ?? ''
  const plainDoc = buildPlainDocumentForKeywordCheck(title, item.summary)
  const rssOk = filterFeedKeywordsLiteralInPlain(item.feedKeywords ?? [], plainDoc)
  const merged = dedupeFacetLabelListForItem(rssOk)
  const filtered = applyHardFilterToCandidateTopics(filterRssFacetLabels(merged))
  const withoutTaxonomy = stripRedundantCategoryLikeTopicLabels(filtered)
  return capItemFeedKeywordList(withoutTaxonomy)
}

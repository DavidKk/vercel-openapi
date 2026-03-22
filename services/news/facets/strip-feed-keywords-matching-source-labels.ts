import { getAllNewsSources } from '../sources/sources'
import type { AggregatedNewsItem } from '../types'
import { dedupeFacetLabelListForItem } from './dedupe-facet-label-substrings'
import { normalizeLabelForOutletMatch } from './facet-label-normalize'
import { stripRedundantCategoryLikeLabelsFromAggregatedItem } from './strip-redundant-topic-category-labels'

export { normalizeLabelForOutletMatch } from './facet-label-normalize'

/** Lazily built set of all manifest `label` values (trimmed, non-empty). */
let manifestSourceLabelSetCache: ReadonlySet<string> | null = null

/**
 * Returns a set of every configured news source display name. Used to drop RSS tags that only repeat an outlet name.
 * @returns Immutable set of trimmed labels from the manifest
 */
export function getNewsManifestSourceLabelSet(): ReadonlySet<string> {
  if (!manifestSourceLabelSetCache) {
    manifestSourceLabelSetCache = new Set(
      getAllNewsSources()
        .map((s) => s.label.trim())
        .filter((t) => t.length > 0)
    )
  }
  return manifestSourceLabelSetCache
}

/**
 * Remove RSS strings that duplicate the row’s primary source name or any manifest outlet label (normalized match).
 * @param values Parsed `feedKeywords` or `feedCategories` entries
 * @param itemSourceLabel Primary source display name for this row
 * @param manifestLabels Set of all manifest source labels
 * @returns Values to keep (original trimmed spelling when kept)
 */
function stripRssStringsMatchingManifestOrPrimarySource(values: string[], itemSourceLabel: string, manifestLabels: ReadonlySet<string>): string[] {
  const primaryNorm = normalizeLabelForOutletMatch(itemSourceLabel)
  const manifestNorms = new Set<string>()
  for (const l of manifestLabels) {
    const n = normalizeLabelForOutletMatch(l)
    if (n) {
      manifestNorms.add(n)
    }
  }
  const out: string[] = []
  for (const raw of values) {
    const k = raw.trim()
    if (!k) {
      continue
    }
    const kn = normalizeLabelForOutletMatch(k)
    if (!kn) {
      continue
    }
    if (kn === primaryNorm || manifestNorms.has(kn)) {
      continue
    }
    out.push(k)
  }
  return out
}

/**
 * Remove RSS `media:keywords` / `keywords` entries that match the row’s own `sourceLabel` or any manifest outlet (normalized).
 * Prevents sidebar “Keywords” from duplicating “Sources” (e.g. 澎湃评论 on a 澎湃评论 item, or 澎湃评论 on 澎湃新闻 when both are outlets).
 * @param keywords Parsed keyword strings from RSS
 * @param itemSourceLabel Primary source display name for this row
 * @param manifestLabels Set of all manifest source labels
 * @returns Keywords to keep on the aggregated item (may be empty)
 */
export function stripFeedKeywordsMatchingSourceLabels(keywords: string[], itemSourceLabel: string, manifestLabels: ReadonlySet<string>): string[] {
  return stripRssStringsMatchingManifestOrPrimarySource(keywords, itemSourceLabel, manifestLabels)
}

/**
 * Remove RSS `category` / `dc:subject` values that match the primary source or any manifest outlet (normalized).
 * @param categories Parsed category strings from RSS
 * @param itemSourceLabel Primary source display name for this row
 * @param manifestLabels Set of all manifest source labels
 * @returns Categories to keep (may be empty)
 */
export function stripFeedCategoriesMatchingOutletNames(categories: string[], itemSourceLabel: string, manifestLabels: ReadonlySet<string>): string[] {
  return stripRssStringsMatchingManifestOrPrimarySource(categories, itemSourceLabel, manifestLabels)
}

/**
 * Build normalized keys for the primary row, merged outlets, platform tags, and the full manifest.
 * @param item Aggregated row (may include `alsoFromSources` / `platformTags`)
 * @param manifestLabels All configured source display names
 * @returns Set of normalized strings to strip from RSS facets
 */
function buildNormalizedOutletBlockSet(item: AggregatedNewsItem, manifestLabels: ReadonlySet<string>): Set<string> {
  const block = new Set<string>()
  for (const l of manifestLabels) {
    const n = normalizeLabelForOutletMatch(l)
    if (n) {
      block.add(n)
    }
  }
  const add = (label: string) => {
    const n = normalizeLabelForOutletMatch(label)
    if (n) {
      block.add(n)
    }
  }
  add(item.sourceLabel)
  for (const r of item.alsoFromSources ?? []) {
    add(r.sourceLabel)
  }
  for (const t of item.platformTags ?? []) {
    add(t.sourceLabel)
  }
  return block
}

/**
 * Drop `feedKeywords` / `feedCategories` that match any displayed outlet name or manifest label (after dedupe merges).
 * @param item Row to mutate in place
 * @param manifestLabels Full manifest label set
 */
export function stripAggregatedItemRssAnnotationsAgainstOutletNames(item: AggregatedNewsItem, manifestLabels: ReadonlySet<string>): void {
  const block = buildNormalizedOutletBlockSet(item, manifestLabels)
  if (item.feedKeywords?.length) {
    const next = item.feedKeywords.filter((raw) => {
      const k = raw.trim()
      if (!k) {
        return false
      }
      return !block.has(normalizeLabelForOutletMatch(k))
    })
    if (next.length > 0) {
      const deduped = dedupeFacetLabelListForItem(next)
      if (deduped.length > 0) {
        item.feedKeywords = deduped
      } else {
        delete item.feedKeywords
      }
    } else {
      delete item.feedKeywords
    }
  }
  if (item.feedCategories?.length) {
    const next = item.feedCategories.filter((raw) => {
      const k = raw.trim()
      if (!k) {
        return false
      }
      return !block.has(normalizeLabelForOutletMatch(k))
    })
    if (next.length > 0) {
      const deduped = dedupeFacetLabelListForItem(next)
      if (deduped.length > 0) {
        item.feedCategories = deduped
      } else {
        delete item.feedCategories
      }
    } else {
      delete item.feedCategories
    }
  }
  stripRedundantCategoryLikeLabelsFromAggregatedItem(item)
}

/**
 * Run {@link stripAggregatedItemRssAnnotationsAgainstOutletNames} on every row (e.g. after `attachPlatformTags`).
 * @param items Pool rows
 * @param manifestLabels Full manifest label set
 */
export function stripAllAggregatedItemsRssAnnotationsAgainstOutletNames(items: AggregatedNewsItem[], manifestLabels: ReadonlySet<string>): void {
  for (const item of items) {
    stripAggregatedItemRssAnnotationsAgainstOutletNames(item, manifestLabels)
  }
}

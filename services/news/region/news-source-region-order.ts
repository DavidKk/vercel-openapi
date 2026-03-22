import type { NewsItemSourceRef, NewsRegion, NewsSourceConfig } from '../types'

/**
 * Sidebar and merged-attribution order: mainland China → Hong Kong / Taiwan → international wire.
 */
export const NEWS_REGION_SIDEBAR_ORDER: readonly NewsRegion[] = ['cn', 'hk_tw', 'intl']

/**
 * Numeric rank for sorting (lower first). Unknown or missing region sorts last.
 * @param region Manifest region or undefined when source id is missing from manifest
 * @returns Rank 0..2, or 99 for unknown
 */
export function newsRegionSidebarRank(region: NewsRegion | undefined): number {
  if (region === undefined) {
    return 99
  }
  const i = NEWS_REGION_SIDEBAR_ORDER.indexOf(region)
  return i === -1 ? 99 : i
}

/**
 * Order "same story, other outlets" refs: 中国 → 港台 → 海外, then label ascending.
 * @param refs Merged {@link NewsItemSourceRef} list (not mutated)
 * @param sourceById Manifest lookup for each `sourceId`
 * @returns New sorted array
 */
export function sortNewsItemSourceRefsByRegion(refs: readonly NewsItemSourceRef[], sourceById: ReadonlyMap<string, Pick<NewsSourceConfig, 'region'>>): NewsItemSourceRef[] {
  return [...refs].sort((a, b) => {
    const ra = newsRegionSidebarRank(sourceById.get(a.sourceId)?.region)
    const rb = newsRegionSidebarRank(sourceById.get(b.sourceId)?.region)
    if (ra !== rb) {
      return ra - rb
    }
    return a.sourceLabel.localeCompare(b.sourceLabel, 'und')
  })
}

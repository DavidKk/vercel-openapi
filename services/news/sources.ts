import { newsSourcesManifest } from './news-sources.manifest'
import type { NewsCategory, NewsRegion, NewsSourceConfig } from './types'

const doc = newsSourcesManifest

/** Manifest category ids in tab order; same set as {@link isValidNewsCategory}. */
export const NEWS_MANIFEST_CATEGORY_ORDER: readonly NewsCategory[] = ['general-news', 'tech-internet', 'social-platform', 'game-entertainment', 'science-academic']

const CATEGORIES = new Set<NewsCategory>(NEWS_MANIFEST_CATEGORY_ORDER)

const REGIONS = new Set<NewsRegion>(['cn', 'hk_tw'])

/**
 * Resolved RSSHub (or other RSS) base URL without trailing slash.
 * @returns Base URL from RSSHUB_BASE_URL or default public instance
 */
export function getNewsFeedBaseUrl(): string {
  const raw = process.env.RSSHUB_BASE_URL?.trim() || 'https://rsshub.app'
  return raw.replace(/\/+$/, '')
}

/**
 * All configured sources from the manifest (immutable copy).
 * @returns Source list
 */
export function getAllNewsSources(): NewsSourceConfig[] {
  return [...doc.sources]
}

/**
 * Filter sources by optional category and/or region.
 * @param category Optional category filter
 * @param region Optional region filter
 * @returns Matching sources in manifest order
 */
export function filterNewsSources(category?: string, region?: string): NewsSourceConfig[] {
  let list = getAllNewsSources()
  if (category) {
    if (!CATEGORIES.has(category as NewsCategory)) {
      return []
    }
    list = list.filter((s) => s.category === category)
  }
  if (region) {
    if (!REGIONS.has(region as NewsRegion)) {
      return []
    }
    list = list.filter((s) => s.region === region)
  }
  return list
}

/**
 * Whether the string is a valid news category.
 * @param value Raw query value
 * @returns True if known category
 */
export function isValidNewsCategory(value: string): value is NewsCategory {
  return CATEGORIES.has(value as NewsCategory)
}

/**
 * Whether the string is a valid phase-1 region.
 * @param value Raw query value
 * @returns True if cn or hk_tw
 */
export function isValidNewsRegion(value: string): value is NewsRegion {
  return REGIONS.has(value as NewsRegion)
}

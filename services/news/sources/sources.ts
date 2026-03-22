import { newsSourcesManifest } from '../config/news-sources.manifest'
import { getNewsCategoryForListSlug, isValidNewsListSlug } from '../config/news-subcategories'
import type { NewsCategory, NewsRegion, NewsSourceConfig } from '../types'

const doc = newsSourcesManifest

/** Manifest category ids in tab order; same set as {@link isValidNewsCategory}. */
export const NEWS_MANIFEST_CATEGORY_ORDER: readonly NewsCategory[] = ['general-news', 'tech-internet', 'game-entertainment', 'science-academic']

const CATEGORIES = new Set<NewsCategory>(NEWS_MANIFEST_CATEGORY_ORDER)

const REGIONS = new Set<NewsRegion>(['cn', 'hk_tw', 'intl'])

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
 * Filter sources by optional flat `list` slug (preferred for UI), optional legacy `category` + `subcategory`, and/or region.
 * When `listSlug` is a valid list key, `category` and `subcategory` are ignored.
 * @param category Optional manifest category (legacy; omit when using `listSlug`)
 * @param region Optional region filter
 * @param subcategory When `category` is set, keep only sources with this manifest `subcategory` slug
 * @param listSlug Optional flat list key (e.g. headlines, media) — maps to one category + one sub-tab
 * @returns Matching sources in manifest order
 */
export function filterNewsSources(category?: string, region?: string, subcategory?: string, listSlug?: string): NewsSourceConfig[] {
  let list = getAllNewsSources()
  const listTrim = listSlug?.trim()

  if (listTrim && isValidNewsListSlug(listTrim)) {
    const cat = getNewsCategoryForListSlug(listTrim)
    if (!cat) {
      list = []
    } else {
      list = list.filter((s) => s.category === cat && s.subcategory === listTrim)
    }
  } else if (category) {
    if (!CATEGORIES.has(category as NewsCategory)) {
      return []
    }
    list = list.filter((s) => s.category === category)
    if (subcategory !== undefined && subcategory !== '') {
      list = list.filter((s) => s.subcategory === subcategory)
    }
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
 * @returns True if cn, hk_tw, or intl
 */
export function isValidNewsRegion(value: string): value is NewsRegion {
  return REGIONS.has(value as NewsRegion)
}

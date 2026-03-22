import type { NewsCategory } from '../types'

/**
 * Manifest top-level category order used to flatten {@link NEWS_SUBCATEGORY_ORDER} into {@link NEWS_LIST_SLUGS_ORDER}.
 * Kept in sync with {@link NEWS_MANIFEST_CATEGORY_ORDER} in `sources.ts` (same sequence).
 */
const NEWS_CATEGORY_ORDER_FOR_LISTS: readonly NewsCategory[] = ['general-news', 'tech-internet', 'game-entertainment', 'science-academic'] as const

/**
 * Ordered subcategory slugs per manifest list tab (phase 1). Each pool / UI sub-tab maps to one slug.
 * Sources in the manifest must use these slugs in {@link NewsSourceConfig.subcategory}.
 */
export const NEWS_SUBCATEGORY_ORDER: Record<NewsCategory, readonly string[]> = {
  'general-news': ['headlines'],
  'tech-internet': ['media', 'developer', 'product'],
  'game-entertainment': ['games'],
  'science-academic': ['stem'],
}

/**
 * Flat UI/API list keys: former “sub-tabs” promoted to a single path segment `/news/[slug]` (slugs are unique across categories).
 */
export const NEWS_LIST_SLUGS_ORDER: readonly string[] = NEWS_CATEGORY_ORDER_FOR_LISTS.flatMap((c) => [...NEWS_SUBCATEGORY_ORDER[c]])

/** Maps each list slug to its manifest `category` (for RSS source filtering and item taxonomy). */
export const NEWS_LIST_SLUG_TO_CATEGORY: Record<string, NewsCategory> = Object.fromEntries(
  NEWS_CATEGORY_ORDER_FOR_LISTS.flatMap((c) => NEWS_SUBCATEGORY_ORDER[c].map((slug) => [slug, c] as const))
) as Record<string, NewsCategory>

/**
 * Short Chinese labels for sub-tabs (slug → label).
 */
const SUB_LABELS: Record<NewsCategory, Record<string, string>> = {
  'general-news': {
    headlines: '要闻速递',
  },
  'tech-internet': {
    media: '科技资讯',
    developer: '开发社区',
    product: '产品工具',
  },
  'game-entertainment': {
    games: '游戏资讯',
  },
  'science-academic': {
    stem: '科学科普',
  },
}

/**
 * English labels for the same slugs as {@link SUB_LABELS} (e.g. News overview channel picker).
 */
const SUB_LABELS_EN: Record<NewsCategory, Record<string, string>> = {
  'general-news': {
    headlines: 'Headlines',
  },
  'tech-internet': {
    media: 'Tech media',
    developer: 'Dev & tech community',
    product: 'Product & tools',
  },
  'game-entertainment': {
    games: 'Gaming',
  },
  'science-academic': {
    stem: 'Science',
  },
}

const MAX_SUB_SLUG_LEN = 48
const SUB_SLUG_RE = /^[a-z][a-z0-9-]*$/

const LIST_SLUG_SET = new Set(NEWS_LIST_SLUGS_ORDER)

/**
 * Whether `slug` is a valid flat list key for `/news/[slug]` or `GET /api/news/feed?list=`.
 * @param slug Path or query segment
 * @returns True when defined in {@link NEWS_LIST_SLUGS_ORDER}
 */
export function isValidNewsListSlug(slug: string): boolean {
  const t = slug?.trim() ?? ''
  if (!t || t.length > MAX_SUB_SLUG_LEN || !SUB_SLUG_RE.test(t)) {
    return false
  }
  return LIST_SLUG_SET.has(t)
}

/**
 * Resolve manifest `category` for a flat list slug.
 * @param slug List slug (e.g. headlines, media)
 * @returns Category or undefined when unknown
 */
export function getNewsCategoryForListSlug(slug: string): NewsCategory | undefined {
  const t = slug?.trim() ?? ''
  if (!t) {
    return undefined
  }
  return NEWS_LIST_SLUG_TO_CATEGORY[t]
}

/**
 * Default list slug for `/news` redirect and invalid paths (first entry in {@link NEWS_LIST_SLUGS_ORDER}).
 * @returns Canonical slug
 */
export function getDefaultNewsListSlug(): string {
  return NEWS_LIST_SLUGS_ORDER[0] ?? 'headlines'
}

/**
 * Normalize raw list slug: valid key or {@link getDefaultNewsListSlug}.
 * @param raw Path segment or query value
 * @returns Non-empty list slug
 */
export function normalizeNewsListSlug(raw: string | null | undefined): string {
  const t = raw?.trim() ?? ''
  if (t && isValidNewsListSlug(t)) {
    return t
  }
  return getDefaultNewsListSlug()
}

/**
 * Return ordered sub-slugs for a category (empty array if unknown).
 * @param category Manifest category
 * @returns Readonly slug list
 */
export function getNewsSubcategorySlugsForCategory(category: NewsCategory): readonly string[] {
  return NEWS_SUBCATEGORY_ORDER[category] ?? []
}

/**
 * Default sub-slug when the URL omits `sub` (first entry in {@link NEWS_SUBCATEGORY_ORDER}).
 * @param category Manifest category
 * @returns Slug, or empty string if none configured
 */
export function getDefaultNewsSubcategory(category: NewsCategory): string {
  const list = NEWS_SUBCATEGORY_ORDER[category]
  return list?.[0] ?? ''
}

/**
 * UI label for a sub-slug under a category.
 * @param category Manifest category
 * @param subcategory Sub-slug
 * @returns Chinese label, or the slug when unmapped
 */
export function getNewsSubcategoryLabel(category: NewsCategory, subcategory: string): string {
  const row = SUB_LABELS[category]
  return row?.[subcategory] ?? subcategory
}

/**
 * UI label for a flat list slug (same copy as the former sub-tab).
 * @param slug List slug
 * @returns Chinese label, or the slug when unmapped
 */
export function getNewsListLabel(slug: string): string {
  const cat = getNewsCategoryForListSlug(slug)
  if (!cat) {
    return slug
  }
  return getNewsSubcategoryLabel(cat, slug)
}

/**
 * English UI label for a flat list slug (channel picker, English-only surfaces).
 * @param slug List slug
 * @returns English label, or the slug when unmapped
 */
export function getNewsListLabelEn(slug: string): string {
  const cat = getNewsCategoryForListSlug(slug)
  if (!cat) {
    return slug
  }
  const row = SUB_LABELS_EN[cat]
  return row?.[slug] ?? slug
}

/**
 * Whether `sub` is a known slug for `category`.
 * @param category Manifest category
 * @param sub Raw sub-slug
 * @returns True when defined in {@link NEWS_SUBCATEGORY_ORDER}
 */
export function isValidNewsSubcategoryForCategory(category: NewsCategory, sub: string): boolean {
  if (!sub || sub.length > MAX_SUB_SLUG_LEN || !SUB_SLUG_RE.test(sub)) {
    return false
  }
  const allowed = NEWS_SUBCATEGORY_ORDER[category]
  return allowed !== undefined && allowed.includes(sub)
}

/**
 * Normalize a raw `sub` query value: valid slug for the category, else default for that category.
 * @param category Manifest category
 * @param raw Query value or null/undefined
 * @returns Canonical sub-slug (never empty when defaults exist)
 */
export function normalizeNewsSubcategory(category: NewsCategory, raw: string | null | undefined): string {
  const t = raw?.trim() ?? ''
  if (t && isValidNewsSubcategoryForCategory(category, t)) {
    return t
  }
  return getDefaultNewsSubcategory(category)
}

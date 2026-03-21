import type { NewsFacetListFilter } from './facet-list-filter'
import { getDefaultNewsSubcategory, isValidNewsListSlug, isValidNewsSubcategoryForCategory, normalizeNewsListSlug } from './news-subcategories'
import { isValidNewsCategory } from './sources'
import type { NewsCategory } from './types'

/** `query` param (legacy): facet kind, comma, value (value may contain commas). */
const QUERY_KIND_PREFIX = /^(fc|fk|src),/i

/** Segments under `/news/*` that are not manifest category slugs (tool/docs routes). */
export const NEWS_NON_CATEGORY_PATH_SEGMENTS = new Set(['api', 'mcp', 'function-calling', 'skill'])

const MAX_FACET_TAG_LEN = 200
const MAX_FACET_SOURCE_LEN = 80
/** Manifest source ids: word chars and hyphen only (aligned with API). */
const SOURCE_QUERY_RE = /^[\w-]+$/

/**
 * Whether `pathname` is a single-segment news feed route like `/news/headlines` (not `/news/api`, etc.).
 * @param pathname Current path from the router
 * @returns True when the segment after `/news` is a flat list slug, not a reserved tool path
 */
export function isNewsListFeedPath(pathname: string): boolean {
  const m = /^\/news\/([^/]+)\/?$/.exec(pathname)
  if (!m) {
    return false
  }
  const seg = m[1]!
  if (NEWS_NON_CATEGORY_PATH_SEGMENTS.has(seg)) {
    return false
  }
  return isValidNewsListSlug(seg)
}

/**
 * @deprecated Use {@link isNewsListFeedPath}; kept for call sites that still import the old name.
 */
export function isNewsManifestCategoryFeedPath(pathname: string): boolean {
  return isNewsListFeedPath(pathname)
}

/**
 * Parse `category` search param for the News overview (legacy `/news?category=` only).
 * @param raw `category` query value or null
 * @returns Manifest category id; invalid/missing → `general-news`
 */
export function parseNewsOverviewCategoryParam(raw: string | null): NewsCategory {
  if (raw && isValidNewsCategory(raw)) {
    return raw
  }
  return 'general-news'
}

/**
 * Parse `query` search param (legacy): `类型,值` — `fc` / `fk` / `src` then first comma, rest is value.
 * @param raw `query` query value or null
 * @returns Facet filter or null when absent/invalid
 */
export function parseNewsOverviewQueryParam(raw: string | null): NewsFacetListFilter | null {
  if (raw === null || raw === '') {
    return null
  }
  const t = raw.trim()
  const m = QUERY_KIND_PREFIX.exec(t)
  if (!m) {
    return null
  }
  const kind = m[1]!.toLowerCase()
  const value = t.slice(m[0].length).trim()
  if (!value) {
    return null
  }
  if (kind === 'fc') {
    return { kind: 'fc', value }
  }
  if (kind === 'fk') {
    return { kind: 'fk', value }
  }
  return { kind: 'src', sourceId: value }
}

/**
 * Serialize legacy facet filter for the `query` param (`类型,值`).
 * @param filter Non-null facet
 * @returns Encoded string for URLSearchParams
 */
export function serializeNewsOverviewQueryParam(filter: NewsFacetListFilter): string {
  if (filter.kind === 'fc') {
    return `fc,${filter.value}`
  }
  if (filter.kind === 'fk') {
    return `fk,${filter.value}`
  }
  return `src,${filter.sourceId}`
}

/**
 * Parse facet from `/news/[slug]?tag=` | `?keyword=` | `?source=` (at most one applies: source wins, then tag, then keyword).
 * @param params Current URL search params
 * @returns Filter for `/api/news/feed` or null
 */
export function parseNewsFacetFromUrlSearchParams(params: Pick<URLSearchParams, 'get'>): NewsFacetListFilter | null {
  const source = params.get('source')?.trim()
  if (source && source.length <= MAX_FACET_SOURCE_LEN && SOURCE_QUERY_RE.test(source)) {
    return { kind: 'src', sourceId: source }
  }
  const tag = params.get('tag')?.trim()
  if (tag && tag.length <= MAX_FACET_TAG_LEN && tag.length > 0) {
    return { kind: 'fc', value: tag }
  }
  const keyword = params.get('keyword')?.trim()
  if (keyword && keyword.length <= MAX_FACET_TAG_LEN && keyword.length > 0) {
    return { kind: 'fk', value: keyword }
  }
  return null
}

/**
 * Build query string params for tag / keyword / source (mutually exclusive in practice).
 * @param filter Facet or null
 * @returns Search params (possibly empty)
 */
export function buildNewsFacetQueryParams(filter: NewsFacetListFilter | null): URLSearchParams {
  const p = new URLSearchParams()
  if (!filter) {
    return p
  }
  if (filter.kind === 'src') {
    p.set('source', filter.sourceId)
  } else if (filter.kind === 'fc') {
    p.set('tag', filter.value)
  } else {
    p.set('keyword', filter.value)
  }
  return p
}

/**
 * Canonical href for the feed UI: `/news/[slug]` plus optional `tag`, `keyword`, or `source`.
 * @param listSlug Flat list key (e.g. headlines, media)
 * @param filter Optional list facet
 * @returns Path + query
 */
export function buildNewsOverviewHref(listSlug: string, filter: NewsFacetListFilter | null): string {
  const base = `/news/${normalizeNewsListSlug(listSlug)}`
  const q = buildNewsFacetQueryParams(filter)
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

/**
 * Whether two facet filters are equivalent.
 * @param a First filter or null
 * @param b Second filter or null
 * @returns True if same selection
 */
export function newsOverviewTagFiltersEqual(a: NewsFacetListFilter | null, b: NewsFacetListFilter | null): boolean {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  if (a.kind !== b.kind) {
    return false
  }
  if (a.kind === 'src' && b.kind === 'src') {
    return a.sourceId === b.sourceId
  }
  if ((a.kind === 'fc' || a.kind === 'fk') && (b.kind === 'fc' || b.kind === 'fk')) {
    return a.value === b.value
  }
  return false
}

/**
 * First string from Next.js `searchParams` value (array or string).
 * @param v Raw param
 * @returns Trimmed string or undefined
 */
function firstSearchParamString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) {
    return undefined
  }
  const s = Array.isArray(v) ? v[0] : v
  const t = s?.trim()
  return t === '' ? undefined : t
}

/**
 * Resolve redirect target for `/news` with optional legacy `category` / `query` or modern `tag` / `keyword` / `source`.
 * @param record `searchParams` from the `/news` root page
 * @returns Path to redirect to (never `/news` alone)
 */
export function resolveNewsFeedLandingHrefFromRootSearch(record: Record<string, string | string[] | undefined>): string {
  const p = new URLSearchParams()
  const src = firstSearchParamString(record.source)
  const tag = firstSearchParamString(record.tag)
  const kw = firstSearchParamString(record.keyword)
  if (src) {
    p.set('source', src)
  } else if (tag) {
    p.set('tag', tag)
  } else if (kw) {
    p.set('keyword', kw)
  }
  let facet = parseNewsFacetFromUrlSearchParams(p)
  if (!facet) {
    const legacyQ = firstSearchParamString(record.query)
    if (legacyQ) {
      facet = parseNewsOverviewQueryParam(legacyQ)
    }
  }
  const listDirect = firstSearchParamString(record.list)
  if (listDirect && isValidNewsListSlug(listDirect)) {
    return buildNewsOverviewHref(listDirect, facet)
  }

  const category = parseNewsOverviewCategoryParam(firstSearchParamString(record.category) ?? null)
  const subParam = firstSearchParamString(record.sub)
  const listFromLegacy = subParam && isValidNewsSubcategoryForCategory(category, subParam) ? subParam : getDefaultNewsSubcategory(category)
  return buildNewsOverviewHref(normalizeNewsListSlug(listFromLegacy), facet)
}

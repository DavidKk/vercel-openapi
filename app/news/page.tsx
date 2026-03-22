import { redirect } from 'next/navigation'

import { createLogger } from '@/services/logger'
import { resolveNewsFeedLandingHrefFromRootSearch } from '@/services/news/routing/news-overview-url'
import { logNewsStructured, NEWS_PAGE_ROOT_FLOW } from '@/services/news/structured-news-log'

const logger = createLogger('news-root-page')

interface NewsRootPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function searchParamsHasNonEmptyString(record: Record<string, string | string[] | undefined>, key: string): boolean {
  const v = record[key]
  if (v === undefined) {
    return false
  }
  const s = Array.isArray(v) ? v[0] : v
  return typeof s === 'string' && s.trim() !== ''
}

/**
 * `/news` redirects to `/news/[slug]` (flat list slug); supports legacy `?category=&sub=` and modern `?tag=&keyword=&source=` and `?list=`.
 */
export default async function NewsRootPage(props: Readonly<NewsRootPageProps>) {
  const sp = await props.searchParams
  const href = resolveNewsFeedLandingHrefFromRootSearch(sp)
  const pathMatch = /^\/news\/([^/?]+)/.exec(href)
  const targetList = pathMatch?.[1] ?? 'unknown'
  const redirectSummary = `News: redirect /news → /news/${targetList}${href.includes('?') ? ' (+ query)' : ''}`
  logNewsStructured(logger, 'info', NEWS_PAGE_ROOT_FLOW, redirectSummary, 'news_root_redirect', {
    targetList,
    targetHasSearchParams: href.includes('?'),
    inputHadLegacyCategory: searchParamsHasNonEmptyString(sp, 'category'),
    inputHadLegacyQuery: searchParamsHasNonEmptyString(sp, 'query'),
    inputHadModernSource: searchParamsHasNonEmptyString(sp, 'source'),
    inputHadModernTag: searchParamsHasNonEmptyString(sp, 'tag'),
    inputHadModernKeyword: searchParamsHasNonEmptyString(sp, 'keyword'),
  })
  redirect(href)
}

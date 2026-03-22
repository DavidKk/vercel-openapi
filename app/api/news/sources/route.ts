import { api } from '@/initializer/controller'
import { jsonForbidden, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'
import { normalizeNewsSubcategory } from '@/services/news/config/news-subcategories'
import { resolveNewsFeedRegionAccess } from '@/services/news/region/news-feed-region-access'
import { filterNewsSources, getNewsFeedBaseUrl, isValidNewsCategory, isValidNewsRegion } from '@/services/news/sources/sources'
import { logNewsStructured, NEWS_SOURCES_API_FLOW } from '@/services/news/structured-news-log'
import type { NewsCategory, NewsRegion } from '@/services/news/types'

export const runtime = 'edge'

const logger = createLogger('api-news-sources')

/**
 * GET /api/news/sources — list configured RSS sources and resolved base URL.
 */
export const GET = api(async (req) => {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  const region = searchParams.get('region') ?? undefined
  const subRaw = searchParams.get('sub')?.trim() ?? ''

  if (category !== undefined && category !== '' && !isValidNewsCategory(category)) {
    return jsonInvalidParameters('invalid category', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }
  if (region !== undefined && region !== '' && !isValidNewsRegion(region)) {
    return jsonInvalidParameters('invalid region', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }

  const subNorm = category !== undefined && category !== '' ? normalizeNewsSubcategory(category as NewsCategory, subRaw || undefined) : undefined
  const requestedRegion: '' | NewsRegion = region !== undefined && region !== '' && isValidNewsRegion(region) ? region : ''
  const session = await getAuthSession()
  const regionAccess = resolveNewsFeedRegionAccess(session.authenticated, requestedRegion)
  if (!regionAccess.ok) {
    return jsonForbidden(regionAccess.message, { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }
  const sources = filterNewsSources(category || undefined, regionAccess.regionFilter, subNorm)
  const baseUrl = getNewsFeedBaseUrl()

  logNewsStructured(logger, 'ok', NEWS_SOURCES_API_FLOW, `News sources ok: ${sources.length} source(s)`, 'news_sources_response', {
    category: category ?? null,
    region: regionAccess.regionCacheKey || 'all',
    sub: subNorm ?? null,
    sourceCount: sources.length,
  })

  return jsonSuccess(
    { sources, baseUrl },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }),
    }
  )
})

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { filterNewsSources, getNewsFeedBaseUrl, isValidNewsCategory, isValidNewsRegion } from '@/services/news/sources'

export const runtime = 'edge'

const logger = createLogger('api-news-sources')

/**
 * GET /api/news/sources — list configured RSS sources and resolved base URL.
 */
export const GET = api(async (req) => {
  logger.info('request')
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  const region = searchParams.get('region') ?? undefined

  if (category !== undefined && category !== '' && !isValidNewsCategory(category)) {
    return jsonInvalidParameters('invalid category', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }
  if (region !== undefined && region !== '' && !isValidNewsRegion(region)) {
    return jsonInvalidParameters('invalid region', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }

  const sources = filterNewsSources(category || undefined, region || undefined)
  const baseUrl = getNewsFeedBaseUrl()

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

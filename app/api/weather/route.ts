import { getPointWeatherNow } from '@/app/actions/weather'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, invalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'

const logger = createLogger('api-weather-now')

export const runtime = 'edge'

/**
 * POST handler for point-based "now" weather.
 * Cache layers (short TTL): 1 browser (if GET), 2 HTTP (Cache-Control), 3 L1 memory (per instance), 4 third-party API.
 * Request body: { "latitude": number, "longitude": number }
 * Returns latest "now" weather for the specified point.
 */
export const POST = api(async (req) => {
  try {
    const body = await req.json()
    const { latitude, longitude } = body ?? {}

    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return invalidParameters('Invalid latitude or longitude').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
    }

    logger.info('request', { latitude, longitude })

    const data = await getPointWeatherNow(latitude, longitude)

    return jsonSuccess(data, {
      headers: new Headers({
        Charset: 'utf-8',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, max-age=300, stale-while-revalidate=600',
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    if (error instanceof Error && error.message.includes('This area is not supported')) {
      return invalidParameters('This area is not supported for this service.').toJsonResponse(404, {
        headers: cacheControlNoStoreHeaders(),
      })
    }

    return invalidParameters(`Invalid request: ${message}`).toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
  }
})

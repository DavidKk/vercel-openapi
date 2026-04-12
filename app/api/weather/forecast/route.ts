import { getPointWeatherForecast } from '@/app/actions/weather'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, invalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'

const logger = createLogger('api-weather-forecast')

export const runtime = 'edge'

/**
 * POST handler for point-based weather forecast.
 * Cache layers (short TTL): 1 browser (if GET), 2 HTTP (Cache-Control), 3 L1 memory (per instance), 4 third-party API.
 * Request body: { latitude, longitude, granularity?, hours?, days? }
 * Returns short-term forecast for the specified point.
 */
export const POST = api(async (req) => {
  try {
    const body = await req.json()
    const { latitude, longitude, granularity, hours, days } = body ?? {}

    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return invalidParameters('Invalid latitude or longitude').toJsonResponse(400, { headers: cacheControlNoStoreHeaders() })
    }

    let normalizedGranularity: 'hourly' | 'daily' = 'hourly'

    if (granularity === 'daily' || granularity === 'hourly') {
      normalizedGranularity = granularity
    } else if (typeof granularity !== 'undefined' && granularity !== null) {
      return invalidParameters('Invalid granularity. Expected "hourly" or "daily".').toJsonResponse(400, {
        headers: cacheControlNoStoreHeaders(),
      })
    }

    let normalizedHours: number | undefined
    let normalizedDays: number | undefined

    if (typeof hours !== 'undefined') {
      if (typeof hours !== 'number' || !Number.isFinite(hours) || hours <= 0) {
        return invalidParameters('Invalid hours parameter. Expected a positive number.').toJsonResponse(400, {
          headers: cacheControlNoStoreHeaders(),
        })
      }
      normalizedHours = hours
    }

    if (typeof days !== 'undefined') {
      if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) {
        return invalidParameters('Invalid days parameter. Expected a positive number.').toJsonResponse(400, {
          headers: cacheControlNoStoreHeaders(),
        })
      }
      normalizedDays = days
    }

    logger.info('request', {
      latitude,
      longitude,
      granularity: normalizedGranularity,
      hours: normalizedHours,
      days: normalizedDays,
    })

    const data = await getPointWeatherForecast(latitude, longitude, normalizedGranularity, normalizedHours, normalizedDays)

    return jsonSuccess(data, {
      headers: new Headers({
        Charset: 'utf-8',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=900, max-age=900, stale-while-revalidate=1800',
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

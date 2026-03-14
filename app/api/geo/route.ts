import { api } from '@/initializer/controller'
import { CACHE_CONTROL_LONG_LIVED, jsonSuccess } from '@/initializer/response'
import { reverseGeocodeWithMeta } from '@/services/china-geo'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-geo')

/** Response header indicating which backend cache layer served the result (L1, L2, …). Omitted when not from cache. */
const HEADER_CACHE_HIT = 'X-Cache-Hit'

async function handleGeocode(latitude: number, longitude: number) {
  logger.info('request', { latitude, longitude })
  const { location: result, cacheLayer } = await reverseGeocodeWithMeta(latitude, longitude)
  if (!result) {
    return jsonSuccess({ error: 'This area is not supported for this service.' }, { status: 404 })
  }
  if (!result.polygon) {
    return jsonSuccess({ error: 'Geo RPC must return polygon (real boundary). Run sql/init-china-geo.sql and ensure china_geo.polygon is populated.' }, { status: 503 })
  }

  const headers = new Headers({ 'Cache-Control': CACHE_CONTROL_LONG_LIVED })
  if (cacheLayer) headers.set(HEADER_CACHE_HIT, cacheLayer)

  return jsonSuccess(result, { headers })
}

/**
 * GET with query params: ?latitude=39.9&longitude=116.4
 * Prefer GET for browser cache: same URL is served from browser cache first, then server.
 */
export const GET = api(async (req) => {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('latitude')
  const lng = searchParams.get('longitude')
  const latitude = lat != null ? Number(lat) : NaN
  const longitude = lng != null ? Number(lng) : NaN

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return jsonSuccess({ error: 'Invalid latitude or longitude' }, { status: 400 })
  }

  return handleGeocode(latitude, longitude)
})

export const POST = api(async (req) => {
  const { latitude, longitude } = await req.json()

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return jsonSuccess({ error: 'Invalid latitude or longitude' }, { status: 400 })
  }

  return handleGeocode(latitude, longitude)
})

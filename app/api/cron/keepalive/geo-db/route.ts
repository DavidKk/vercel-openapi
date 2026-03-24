import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getSupabase } from '@/services/china-geo/client'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-geo-db-keepalive')
const RPC_NAME = 'geo_containing_point_deepest'

/**
 * Rough mainland-China bounding boxes (lng/lat).
 * We pick random points from these boxes to avoid repeatedly hitting identical params.
 */
const MAINLAND_CHINA_BOXES = [
  { minLng: 73.5, maxLng: 96.5, minLat: 34.0, maxLat: 49.5 },
  { minLng: 96.0, maxLng: 111.0, minLat: 20.0, maxLat: 34.5 },
  { minLng: 111.0, maxLng: 124.5, minLat: 20.0, maxLat: 41.5 },
]

const DEFAULT_ATTEMPTS = 4
const MAX_ATTEMPTS = 12
const POSITIVE_INT_RE = /^\d+$/

/**
 * Parse positive int in [1, max], or return default when empty.
 * @param raw Raw query parameter value
 * @param defaultValue Default when raw is empty
 * @param max Upper bound (inclusive)
 * @returns Parsed integer or null when invalid
 */
function parseAttempts(raw: string | null, defaultValue: number, max: number): number | null {
  if (!raw || raw.trim() === '') {
    return defaultValue
  }
  const trimmed = raw.trim()
  if (!POSITIVE_INT_RE.test(trimmed)) {
    return null
  }
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n < 1) {
    return null
  }
  return Math.min(max, n)
}

/**
 * Generate a random lng/lat point from coarse China boxes.
 * @returns Random coordinate pair
 */
function randomMainlandPoint(): { lng: number; lat: number } {
  const box = MAINLAND_CHINA_BOXES[Math.floor(Math.random() * MAINLAND_CHINA_BOXES.length)]!
  const lng = box.minLng + Math.random() * (box.maxLng - box.minLng)
  const lat = box.minLat + Math.random() * (box.maxLat - box.minLat)
  return {
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
  }
}

/**
 * Cron keepalive for china_geo Supabase DB.
 * Performs direct RPC calls with random parameters so traffic pattern is less uniform.
 *
 * Query:
 * - attempts: optional, number of RPC calls per run (default 4, max 12)
 */
export const GET = cron(async (_req, context) => {
  const attempts = parseAttempts(context.searchParams.get('attempts'), DEFAULT_ATTEMPTS, MAX_ATTEMPTS)
  if (attempts === null) {
    return jsonInvalidParameters('invalid attempts', { headers: cacheControlNoStoreHeaders() })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return jsonInvalidParameters('Supabase is not configured for china-geo', { headers: cacheControlNoStoreHeaders() })
  }

  const startedAt = Date.now()
  const probes: Array<{ lng: number; lat: number; matched: boolean; rows: number; error: string | null }> = []
  let success = 0
  let matched = 0

  for (let i = 0; i < attempts; i += 1) {
    const point = randomMainlandPoint()
    try {
      const { data, error } = await supabase.rpc(RPC_NAME, {
        lng: point.lng,
        lat: point.lat,
      })
      if (error) {
        probes.push({ ...point, matched: false, rows: 0, error: error.message })
        continue
      }
      const rows = Array.isArray(data) ? data.length : 0
      probes.push({ ...point, matched: rows > 0, rows, error: null })
      success += 1
      if (rows > 0) {
        matched += 1
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      probes.push({ ...point, matched: false, rows: 0, error: reason })
    }
  }

  const durationMs = Date.now() - startedAt
  logger.info('geo db keepalive done', { attempts, success, matched, durationMs })

  return jsonSuccess(
    {
      ok: success > 0,
      attempts,
      success,
      matched,
      durationMs,
      rpc: RPC_NAME,
      probes,
    },
    { headers: cacheControlNoStoreHeaders() }
  )
})

import { unstable_cache } from 'next/cache'

import { formatJsonSummaryForLog } from '@/utils/format-json-summary'

import { getCached, getGridKey, getRegionKey, setCached } from './cache'
import { getSupabase } from './client'
import { logger } from './logger'
import { getCachedTurso, setCachedTurso } from './turso-cache'
import type { GeoContainingPointRow, GeoLocation } from './types'

/** Revalidate interval for Next.js Data Cache (L2); 24h so geo data is stable across requests. */
const NEXT_CACHE_REVALIDATE_S = 86400

export type { GeoLocation } from './types'

const RPC_NAME = 'geo_containing_point_deepest'

/**
 * Convert RPC rows to GeoLocation[]. Only rows with polygon (real boundary) are returned.
 */
function rowsToLocations(rows: GeoContainingPointRow[], latitude: number, longitude: number): GeoLocation[] {
  const out: GeoLocation[] = []
  for (const row of rows) {
    if (!row || (row.province_name == null && row.city_name == null && row.district_name == null)) {
      continue
    }
    const polygon = row.polygon != null && String(row.polygon).trim() !== '' ? row.polygon : undefined
    if (!polygon) continue
    out.push({
      province: row.province_name ?? '',
      city: row.city_name ?? '',
      district: row.district_name ?? '',
      latitude,
      longitude,
      province_id: row.province_id ?? undefined,
      city_id: row.city_id ?? undefined,
      district_id: row.district_id ?? undefined,
      polygon,
    })
  }
  return out
}

/**
 * Fetch reverse-geocode from Supabase RPC (no cache).
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns All GeoLocation results from RPC, or empty array on error/empty
 */
async function reverseGeocodeRpc(latitude: number, longitude: number): Promise<GeoLocation[]> {
  const supabase = getSupabase()
  if (!supabase) {
    logger.warn('Supabase not configured (CHINA_GEO_SUPABASE_URL / key)')
    return []
  }

  try {
    const { data, error } = await supabase.rpc(RPC_NAME, {
      lng: longitude,
      lat: latitude,
    })

    if (error) {
      logger.warn(`Supabase RPC ${RPC_NAME} failed`, { message: error.message })
      return []
    }

    const rows = (data ?? []) as GeoContainingPointRow[]
    const locations = rowsToLocations(rows, latitude, longitude)
    if (locations.length > 0) {
      logger.info('reverseGeocode: Supabase result', formatJsonSummaryForLog(locations[0], ['polygon'], { stringPreviewLength: 40 }))
    }
    if (rows.length > 0 && locations.length === 0 && rows[0]) {
      const first = rows[0] as unknown as Record<string, unknown>
      logger.warn('RPC row has no polygon; skipped. Keys from Supabase:', Object.keys(first), {
        polygon: first?.polygon != null ? '(present)' : null,
      })
    }
    return locations
  } catch (err) {
    logger.fail('Reverse geocoding failed:', err)
    return []
  }
}

/**
 * Fetch from Next.js Data Cache (L2) or RPC, then fill in-memory LRU (L1).
 * Uses unstable_cache when available (Node only). On Edge (e.g. /api/geo route) unstable_cache
 * is not supported, so we fall back to RPC; L2 is effectively skipped. See .ai/specs/cache-review.md.
 */
async function fetchWithNextCacheOrRpc(latitude: number, longitude: number): Promise<GeoLocation[]> {
  const gridKey = getGridKey(latitude, longitude)
  try {
    const cachedFn = unstable_cache((lat: number, lng: number) => reverseGeocodeRpc(lat, lng), ['china-geo', gridKey], { revalidate: NEXT_CACHE_REVALIDATE_S })
    return await cachedFn(latitude, longitude)
  } catch {
    return reverseGeocodeRpc(latitude, longitude)
  }
}

/** Cache layer identifier for response header (L1 = memory, L2 = Turso, etc.). */
export type GeoCacheLayer = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

/** Result of reverseGeocodeWithMeta: location plus which cache layer served it (if any). */
export interface ReverseGeocodeResult {
  location: GeoLocation | null
  /** Set only when response was served from a backend cache layer; omit header when null. */
  cacheLayer: GeoCacheLayer | null
}

/**
 * Reverse geocode with cache-layer info for response headers.
 * Use this in API routes to set X-Cache-Hit when a backend cache layer served the result.
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns Result with location and cacheLayer (L1/L2/… or null if not from cache)
 */
export async function reverseGeocodeWithMeta(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  let cached = getCached(latitude, longitude)
  if (cached !== undefined && cached[0]?.polygon) {
    return { location: cached[0] ?? null, cacheLayer: 'L1' }
  }
  const turso = await getCachedTurso(latitude, longitude)
  if (turso?.locations?.length && turso.locations[0]?.polygon) {
    return { location: turso.locations[0] ?? null, cacheLayer: 'L2' }
  }

  let locations = await fetchWithNextCacheOrRpc(latitude, longitude)
  if (locations[0] && !locations[0].polygon) {
    locations = await reverseGeocodeRpc(latitude, longitude)
  }
  setCached(latitude, longitude, locations)
  if (locations.length > 0 && locations[0].polygon) {
    await setCachedTurso(getRegionKey(locations[0]), { locations, polygon: locations[0].polygon })
  }
  return { location: locations[0] ?? null, cacheLayer: null }
}

/**
 * Reverse geocode a point to province/city/district using Supabase china_geo.
 * Cache: L1 in-memory (best effort on Edge), then L2 Turso (when configured), then RPC.
 * China only; returns null for coordinates outside mainland China.
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns GeoLocation or null if not found or Supabase not configured
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoLocation | null> {
  const { location } = await reverseGeocodeWithMeta(latitude, longitude)
  return location
}

/**
 * Reverse geocode a point and return all matching locations from RPC.
 * Cache: L1 in-memory, then L2 Turso (when configured), then RPC.
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns All GeoLocation results (empty if not in China or error)
 */
export async function reverseGeocodeAll(latitude: number, longitude: number): Promise<GeoLocation[]> {
  let cached = getCached(latitude, longitude)
  if (cached === undefined) {
    const turso = await getCachedTurso(latitude, longitude)
    if (turso?.locations?.length && turso.locations[0]?.polygon) cached = turso.locations
  }
  if (cached !== undefined && cached[0]?.polygon) {
    return cached
  }

  let locations = await fetchWithNextCacheOrRpc(latitude, longitude)
  if (locations[0] && !locations[0].polygon) {
    locations = await reverseGeocodeRpc(latitude, longitude)
  }
  setCached(latitude, longitude, locations)
  if (locations.length > 0 && locations[0].polygon) {
    await setCachedTurso(getRegionKey(locations[0]), { locations, polygon: locations[0].polygon })
  }
  return locations
}

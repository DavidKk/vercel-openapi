import { formatJsonSummaryForLog } from '@/utils/format-json-summary'

import { getSupabase } from './client'
import { logger } from './logger'
import type { GeoContainingPointRow, GeoLocation } from './types'

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
 * Fetch reverse-geocode from Supabase RPC only (no server-side application cache).
 *
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
 * If the first row has no polygon, retry RPC once (same as previous behavior without Next cache).
 */
async function reverseGeocodeRpcWithPolygonRetry(latitude: number, longitude: number): Promise<GeoLocation[]> {
  let locations = await reverseGeocodeRpc(latitude, longitude)
  if (locations[0] && !locations[0].polygon) {
    locations = await reverseGeocodeRpc(latitude, longitude)
  }
  return locations
}

/** Result of reverseGeocodeWithMeta (location only; no server cache layer). */
export interface ReverseGeocodeResult {
  location: GeoLocation | null
}

/**
 * Reverse geocode with a stable return shape for API routes.
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns Location from Supabase RPC, or null if unsupported / not configured
 */
export async function reverseGeocodeWithMeta(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const locations = await reverseGeocodeRpcWithPolygonRetry(latitude, longitude)
  return { location: locations[0] ?? null }
}

/**
 * Reverse geocode a point to province/city/district using Supabase china_geo (RPC only).
 * China only; returns null for coordinates outside mainland China or when Supabase is not configured.
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
 *
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns All GeoLocation results (empty if not in China or error)
 */
export async function reverseGeocodeAll(latitude: number, longitude: number): Promise<GeoLocation[]> {
  return reverseGeocodeRpcWithPolygonRetry(latitude, longitude)
}

/**
 * Resolve geo for a point: IndexedDB first, then GET /api/geo. For use when cache key must be region-based (e.g. weather).
 * Do not import from API routes or server code (browser only).
 */

import type { GeoLocationStored } from './idb-cache'
import { getGeoFromIdb, setGeoInIdb } from './idb-cache'

/** Stable key for deduplication and negative cache (5 decimals ≈ 1.1 m). */
function geoRequestKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

/** In-flight GET /api/geo per key so concurrent callers share one network request. */
const inFlightGeo = new Map<string, Promise<GeoLocationStored | null>>()

/**
 * After a failed geo lookup (404 or empty body), skip re-fetching the same key for this long to avoid
 * hammering `/api/geo` when Supabase/china_geo is unset locally or the point is unsupported.
 */
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000
const negativeGeoUntil = new Map<string, number>()

/**
 * Get region location for (lat, lng): IndexedDB first, then GET /api/geo. Writes to IDB when API returns polygon.
 * Deduplicates concurrent requests per rounded coordinate and briefly caches failed lookups.
 *
 * @param lat Latitude in decimal degrees
 * @param lng Longitude in decimal degrees
 * @returns GeoLocationStored or null if not in China / API error
 */
export async function getGeoForPoint(lat: number, lng: number): Promise<GeoLocationStored | null> {
  const key = geoRequestKey(lat, lng)

  const negUntil = negativeGeoUntil.get(key)
  if (negUntil != null) {
    if (Date.now() < negUntil) return null
    negativeGeoUntil.delete(key)
  }

  const cached = await getGeoFromIdb(lat, lng)
  if (cached) return cached

  const existing = inFlightGeo.get(key)
  if (existing) return existing

  const promise = fetchGeoForPointOnce(lat, lng, key).finally(() => {
    inFlightGeo.delete(key)
  })
  inFlightGeo.set(key, promise)
  return promise
}

/**
 * Single GET /api/geo; records negative cache when the API returns an error or empty data.
 * @param key Same as {@link geoRequestKey} for this lat/lng
 */
async function fetchGeoForPointOnce(lat: number, lng: number, key: string): Promise<GeoLocationStored | null> {
  const url = `/api/geo?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`
  const res = await fetch(url, { method: 'GET', cache: 'default' })
  const json = await res.json()

  if (!res.ok) {
    negativeGeoUntil.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS)
    return null
  }
  const data = json.data as GeoLocationStored | undefined
  if (!data) {
    negativeGeoUntil.set(key, Date.now() + NEGATIVE_CACHE_TTL_MS)
    return null
  }
  if (data.polygon) await setGeoInIdb(data)
  return data
}

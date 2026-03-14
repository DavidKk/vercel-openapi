/**
 * Resolve geo for a point: IDB first, then GET /api/geo. For use when cache key must be region-based (e.g. weather).
 * Do not import from API routes or server code (browser only).
 */

import type { GeoLocationStored } from './idb-cache'
import { getGeoFromIdb, setGeoInIdb } from './idb-cache'

/**
 * Get region location for (lat, lng): IndexedDB first, then GET /api/geo. Writes to IDB when API returns polygon.
 *
 * @param lat Latitude in decimal degrees
 * @param lng Longitude in decimal degrees
 * @returns GeoLocationStored or null if not in China / API error
 */
export async function getGeoForPoint(lat: number, lng: number): Promise<GeoLocationStored | null> {
  const cached = await getGeoFromIdb(lat, lng)
  if (cached) return cached

  const url = `/api/geo?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`
  const res = await fetch(url, { method: 'GET', cache: 'default' })
  const json = await res.json()

  if (!res.ok) return null
  const data = json.data as GeoLocationStored | undefined
  if (!data) return null
  if (data.polygon) await setGeoInIdb(data)
  return data
}

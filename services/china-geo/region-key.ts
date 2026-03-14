/**
 * Stable region key for geo/weather caches. Shared by server (L1/L2/Turso) and client (IDB).
 * All geography-based caches must be keyed by region, not by a single point (lat/lng).
 */

/** Minimal location shape needed to build a region key (ids or name + rounded coords). */
export interface LocationForRegionKey {
  province: string
  city: string
  district: string
  latitude: number
  longitude: number
  province_id?: number
  city_id?: number
  district_id?: number
}

/**
 * Build a stable region key from a location. Prefer ids to avoid name collision across provinces.
 * Used by server (geo cache, weather cache) and client (weather IDB/singleton).
 *
 * @param loc Location with province/city/district and optional ids
 * @returns Region key string (e.g. "province_id|city_id|district_id" or "province|city|district|lat|lng")
 */
export function getRegionKey(loc: LocationForRegionKey): string {
  if (loc.province_id != null && loc.city_id != null && loc.district_id != null) {
    return `${loc.province_id}|${loc.city_id}|${loc.district_id}`
  }
  return `${loc.province}|${loc.city}|${loc.district}|${loc.latitude.toFixed(4)}|${loc.longitude.toFixed(4)}`
}

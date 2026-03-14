import { createLruCache } from '@/services/lru-cache'
import { getGridKey as getGridKeyUtil } from '@/utils/geo-grid-key'

import { getRegionKey } from './region-key'
import type { GeoLocation } from './types'

/**
 * Maximum number of region entries in L1 cache. One entry per region (e.g. province/city/district);
 * many regions possible, so 2000 keeps hot regions in memory without unbounded growth.
 */
const LRU_MAX_SIZE = 2000

/** Cached value: locations and polygon for point-in-region lookup. Only stored when polygon present. */
interface CachedGeo {
  locations: GeoLocation[]
  polygon?: string
}

const lru = createLruCache<string, CachedGeo>(LRU_MAX_SIZE)

/** Re-export for Next.js unstable_cache key (Node only). Not used as cache key for L1/L2. */
export const getGridKey = getGridKeyUtil

/** Re-export for server and callers that import from cache. */
export { getRegionKey }

/** Parse "lng lat,lng lat,..." to [lng, lat][]. */
function parsePolygon(s: string): [number, number][] {
  if (!s || typeof s !== 'string') return []
  return s
    .split(',')
    .map((p) => p.trim().split(/\s+/).map(Number))
    .filter((p) => p.length >= 2)
    .map((p) => [p[0], p[1]] as [number, number])
}

/** Ray-casting point-in-polygon; ring is [lng, lat][]. */
function pointInPolygon(lng: number, lat: number, ring: [number, number][]): boolean {
  if (ring.length < 3) return false
  let inside = false
  const n = ring.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Get cached result by point-in-polygon over region entries. Key is region key only (no grid/lat/lng).
 * @param lat Latitude in decimal degrees
 * @param lng Longitude in decimal degrees
 * @returns Cached GeoLocation[] if point falls in a cached region, or undefined on miss
 */
export function getCached(lat: number, lng: number): GeoLocation[] | undefined {
  for (const [key, val] of lru.entries()) {
    if (val.polygon) {
      const ring = parsePolygon(val.polygon)
      if (ring.length >= 3 && pointInPolygon(lng, lat, ring)) {
        lru.get(key)
        return val.locations
      }
    }
  }
  return undefined
}

/**
 * Store result by region key only when we have a region with polygon. Empty results are not cached (aligns with IDB/Turso).
 * @param _lat Latitude (unused; region key comes from locations[0])
 * @param _lng Longitude (unused)
 * @param locations All locations from RPC (empty = no result / outside supported region)
 */
export function setCached(_lat: number, _lng: number, locations: GeoLocation[]): void {
  if (locations.length === 0 || !locations[0].polygon) return
  const regionKey = getRegionKey(locations[0])
  lru.set(regionKey, { locations, polygon: locations[0].polygon })
}

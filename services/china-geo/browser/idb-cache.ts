/**
 * Browser-only IndexedDB cache for reverse-geocode results (region key + polygon).
 * Uses shared DB; store geo_regions with index on minLng for cursor lookup.
 * Do not import this (or any file under browser/) from API routes or server code (no window).
 */

import { parsePolygonRing } from '@/services/china-geo/parse-polygon-ring'
import { IDB_STORES, openSharedDb } from '@/services/idb-cache'

const STORE_NAME = IDB_STORES.GEO_REGIONS
/** Index for cursor range: only scan records where minLng <= lng. */
const INDEX_MIN_LNG = 'by_min_lng'
/** TTL 1 year in ms. */
const TTL_MS = 365 * 24 * 60 * 60 * 1000

/** Stored shape (matches API data: polygon is the only range field; no bbox). */
export interface GeoLocationStored {
  province: string
  city: string
  district: string
  latitude: number
  longitude: number
  province_id?: number
  city_id?: number
  district_id?: number
  /** Real boundary polygon; first `;`-separated ring used for point-in-polygon lookup. */
  polygon?: string
}

/** Record shape in IDB: bounds (from polygon) split so we can index and filter without parsing data. */
interface GeoRegionRow {
  key: string
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
  storedAt: number
  data: GeoLocationStored
}

function openDb(): Promise<IDBDatabase> {
  return openSharedDb(STORE_NAME)
}

/**
 * Ray-casting point-in-polygon. Ring is array of [lng, lat].
 * @param lng Point longitude
 * @param lat Point latitude
 * @param ring Polygon exterior ring as [lng, lat][]
 * @returns True if point is inside the polygon
 */
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
 * Compute [minLng, minLat, maxLng, maxLat] from polygon string for cursor index.
 * @param polygon "lng lat,lng lat,..."
 * @returns Bounds or null if invalid
 */
function polygonToBounds(polygon: string): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  const ring = parsePolygonRing(polygon)
  if (ring.length < 3) return null
  const lngs = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  return {
    minLng: Math.min(...lngs),
    minLat: Math.min(...lats),
    maxLng: Math.max(...lngs),
    maxLat: Math.max(...lats),
  }
}

/**
 * Stable cache key for a region. Prefer ids to avoid collision.
 * Fallback appends lat|lng so same name in different provinces stay distinct.
 */
function getRegionKey(data: GeoLocationStored): string {
  if (data.province_id != null && data.city_id != null && data.district_id != null) {
    return `${data.province_id}|${data.city_id}|${data.district_id}`
  }
  const center = `${data.latitude.toFixed(4)}|${data.longitude.toFixed(4)}`
  return `${data.province}|${data.city}|${data.district}|${center}`
}

/**
 * Get cached geo for (lat, lng) by cursor over regions with minLng <= lng, then point-in-polygon.
 * Returns at first match; never loads all entries (suitable for large stores).
 *
 * @param lat Latitude in decimal degrees
 * @param lng Longitude in decimal degrees
 * @returns Cached GeoLocationStored or null
 */
export async function getGeoFromIdb(lat: number, lng: number): Promise<GeoLocationStored | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index(INDEX_MIN_LNG)
    const range = IDBKeyRange.upperBound(lng)
    const req = index.openCursor(range)
    const now = Date.now()

    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        db.close()
        resolve(null)
        return
      }
      const row = cursor.value as GeoRegionRow
      if (now - (row.storedAt ?? 0) > TTL_MS) {
        cursor.continue()
        return
      }
      const inBounds = lng <= row.maxLng && lat >= row.minLat && lat <= row.maxLat
      if (inBounds && row.data.polygon) {
        const ring = parsePolygonRing(row.data.polygon)
        if (ring.length >= 3 && pointInPolygon(lng, lat, ring)) {
          db.close()
          resolve(row.data)
          return
        }
      } else if (inBounds && !row.data.polygon) {
        /** Legacy entry stored with bbox-only; accept by bounds. */
        db.close()
        resolve(row.data)
        return
      }
      cursor.continue()
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * Store geo result by region key. Bounds for cursor index are derived from polygon.
 * Triggers a fire-and-forget cleanup of expired entries to avoid unbounded store growth.
 *
 * @param data Geo result from API (must include polygon; province_id/city_id/district_id preferred for key)
 */
export async function setGeoInIdb(data: GeoLocationStored): Promise<void> {
  if (!data.polygon) return
  const bounds = polygonToBounds(data.polygon)
  if (!bounds) return
  const { minLng, minLat, maxLng, maxLat } = bounds
  const key = getRegionKey(data)
  const row: GeoRegionRow = {
    key,
    minLng,
    minLat,
    maxLng,
    maxLat,
    storedAt: Date.now(),
    data,
  }
  if (typeof window === 'undefined' || !window.indexedDB) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(row)
    req.onsuccess = () => {
      db.close()
      deleteExpiredGeoRegions().catch(() => {})
      resolve()
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * Remove expired entries (storedAt older than TTL). Call opportunistically (e.g. after setGeoInIdb).
 * Fire-and-forget; avoids unbounded store growth when many regions are cached.
 */
export function deleteExpiredGeoRegions(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve()
  const cutoff = Date.now() - TTL_MS
  return openDb().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.openCursor()

      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) {
          db.close()
          resolve()
          return
        }
        const row = cursor.value as GeoRegionRow
        if ((row.storedAt ?? 0) < cutoff) cursor.delete()
        cursor.continue()
      }
      req.onerror = () => {
        db.close()
        reject(req.error)
      }
    })
  })
}

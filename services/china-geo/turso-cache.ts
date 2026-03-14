/**
 * Turso-backed geo cache by region key (same idea as IndexedDB: one entry per region, lookup by point-in-polygon).
 * Key = region key (getRegionKey); value = CachedGeo; bounds (min_lng etc.) for range query. LRU eviction.
 */

import { getTursoClient } from '@/services/turso/client'

import type { GeoLocation } from './types'

/** Cached value shape (matches in-memory CachedGeo). */
export interface CachedGeo {
  locations: GeoLocation[]
  polygon?: string
}

const TABLE_NAME = 'geo_region_cache'
const MAX_ROWS = 10_000

let tableEnsured = false

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

/** Bounds from polygon string for DB index/range query. */
function polygonToBounds(polygon: string): { minLng: number; minLat: number; maxLng: number; maxLat: number } | null {
  const ring = parsePolygon(polygon)
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

async function ensureTable(): Promise<void> {
  if (tableEnsured) return
  const db = getTursoClient()
  if (!db) return
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        cache_key TEXT PRIMARY KEY,
        min_lng REAL NOT NULL,
        min_lat REAL NOT NULL,
        max_lng REAL NOT NULL,
        max_lat REAL NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_min_lng ON ${TABLE_NAME}(min_lng)`)
    tableEnsured = true
  } catch {
    // ignore
  }
}

/**
 * Get cached geo for (lat, lng) from Turso: query rows whose bbox contains the point, then point-in-polygon.
 * Returns first matching region. Aligns with IndexedDB (region key + polygon), not grid key.
 *
 * @param lat Latitude in decimal degrees
 * @param lng Longitude in decimal degrees
 * @returns CachedGeo or undefined
 */
export async function getCachedTurso(lat: number, lng: number): Promise<CachedGeo | undefined> {
  const db = getTursoClient()
  if (!db) return undefined
  try {
    await ensureTable()
    const rs = await db.execute({
      sql: `SELECT cache_key, value FROM ${TABLE_NAME} WHERE min_lng <= ? AND max_lng >= ? AND min_lat <= ? AND max_lat >= ?`,
      args: [lng, lng, lat, lat],
    })
    for (const row of rs.rows) {
      const valueStr = row.value
      if (typeof valueStr !== 'string') continue
      const data = JSON.parse(valueStr) as CachedGeo
      if (!data?.polygon || !Array.isArray(data.locations)) continue
      const ring = parsePolygon(data.polygon)
      if (ring.length >= 3 && pointInPolygon(lng, lat, ring)) return data
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Set cached geo by region key in Turso. Bounds are derived from polygon for range queries. LRU eviction.
 * Only call for non-empty results with polygon (same as IndexedDB).
 *
 * @param regionKey Region key from getRegionKey(location)
 * @param data CachedGeo to store (must have polygon for bounds)
 */
export async function setCachedTurso(regionKey: string, data: CachedGeo): Promise<void> {
  if (!data.polygon) return
  const bounds = polygonToBounds(data.polygon)
  if (!bounds) return
  const db = getTursoClient()
  if (!db) return
  try {
    await ensureTable()
    const value = JSON.stringify(data)
    const updatedAt = Date.now()
    await db.execute({
      sql: `INSERT OR REPLACE INTO ${TABLE_NAME} (cache_key, min_lng, min_lat, max_lng, max_lat, value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [regionKey, bounds.minLng, bounds.minLat, bounds.maxLng, bounds.maxLat, value, updatedAt],
    })
    const countRs = await db.execute(`SELECT COUNT(*) as n FROM ${TABLE_NAME}`)
    const n = Number((countRs.rows[0] as { n?: number })?.n ?? 0)
    if (n > MAX_ROWS) {
      const toDelete = n - MAX_ROWS
      await db.execute({
        sql: `DELETE FROM ${TABLE_NAME} WHERE cache_key IN (SELECT cache_key FROM ${TABLE_NAME} ORDER BY updated_at ASC LIMIT ?)`,
        args: [toDelete],
      })
    }
  } catch {
    // ignore
  }
}

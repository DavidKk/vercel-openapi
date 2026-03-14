/**
 * Turso-backed L2 cache for weather. Key = cache key (type:regionKey or type:regionKey:extra);
 * value = { timestamp, data }. TTL enforced on read (now 5 min, forecast 30 min). LRU eviction by updated_at.
 */

import { getTursoClient } from '@/services/turso/client'

/** Stored value: timestamp for TTL check, data is the API response JSON. */
export interface WeatherCacheEntry {
  timestamp: number
  data: unknown
}

const TABLE_NAME = 'weather_cache'
/** Max rows; evict oldest by updated_at when exceeded. Weather TTL is short so 2000 is enough. */
const MAX_ROWS = 2000

let tableEnsured = false

async function ensureTable(): Promise<void> {
  if (tableEnsured) return
  const db = getTursoClient()
  if (!db) return
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        cache_key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_updated ON ${TABLE_NAME}(updated_at)`)
    tableEnsured = true
  } catch {
    // ignore
  }
}

/**
 * Get weather from Turso L2. Returns undefined on miss or when entry is past TTL.
 *
 * @param cacheKey Same key as L1 (e.g. now:regionKey or forecast:regionKey:extra)
 * @param ttlMs TTL in ms (e.g. 5 min for now, 30 min for forecast)
 * @returns Cached data or undefined
 */
export async function getCachedTurso(cacheKey: string, ttlMs: number): Promise<WeatherCacheEntry | undefined> {
  const db = getTursoClient()
  if (!db) return undefined
  try {
    await ensureTable()
    const rs = await db.execute({
      sql: `SELECT value, updated_at FROM ${TABLE_NAME} WHERE cache_key = ?`,
      args: [cacheKey],
    })
    const row = rs.rows[0]
    if (!row || typeof row.value !== 'string') return undefined
    const entry = JSON.parse(row.value) as WeatherCacheEntry
    if (!entry || typeof entry.timestamp !== 'number') return undefined
    if (Date.now() - entry.timestamp >= ttlMs) return undefined
    return entry
  } catch {
    return undefined
  }
}

/**
 * Set weather in Turso L2. Call after a successful third-party API response. LRU eviction when over MAX_ROWS.
 *
 * @param cacheKey Same key as L1
 * @param entry { timestamp, data }
 */
export async function setCachedTurso(cacheKey: string, entry: WeatherCacheEntry): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  try {
    await ensureTable()
    const value = JSON.stringify(entry)
    const updatedAt = Date.now()
    await db.execute({
      sql: `INSERT OR REPLACE INTO ${TABLE_NAME} (cache_key, value, updated_at) VALUES (?, ?, ?)`,
      args: [cacheKey, value, updatedAt],
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

/**
 * Turso-backed L2 cache for exchange rates. Key = base currency (e.g. USD);
 * value = { timestamp, data }. TTL enforced on read. LRU eviction by updated_at.
 */

import { getTursoClient } from '@/services/turso/client'

/** Stored value: timestamp for TTL check, data is the exchange rate response. */
export interface ExchangeRateCacheEntry {
  timestamp: number
  data: unknown
}

const TABLE_NAME = 'exchange_rate_cache'
const MAX_ROWS = 500

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
 * Get exchange rate from Turso L2. Returns undefined on miss or when entry is past TTL.
 *
 * @param cacheKey Base currency code (e.g. USD)
 * @param ttlMs TTL in ms (e.g. 5 min)
 * @returns Cached entry or undefined
 */
export async function getCachedTurso(cacheKey: string, ttlMs: number): Promise<ExchangeRateCacheEntry | undefined> {
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
    const entry = JSON.parse(row.value) as ExchangeRateCacheEntry
    if (!entry?.data || typeof entry.timestamp !== 'number') return undefined
    if (Date.now() - entry.timestamp >= ttlMs) return undefined
    return entry
  } catch {
    return undefined
  }
}

/**
 * Set exchange rate in Turso L2. LRU eviction when over MAX_ROWS.
 *
 * @param cacheKey Base currency code (e.g. USD)
 * @param entry { timestamp, data }
 */
export async function setCachedTurso(cacheKey: string, entry: ExchangeRateCacheEntry): Promise<void> {
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

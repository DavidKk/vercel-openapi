import { createLogger } from '@/services/logger'
import { getTursoClient } from '@/services/turso/client'

import type { FinanceMarketDailyRecord } from './types'

const logger = createLogger('finance-market-daily-turso')
const TABLE_NAME = 'finance_market_daily_ohlcv'
const WRITE_CHUNK_SIZE = 80
let tablesEnsured = false

/**
 * Ensure market daily table exists.
 */
async function ensureTable(): Promise<void> {
  if (tablesEnsured) return
  const db = getTursoClient()
  if (!db) return
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        source TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (symbol, date, source)
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date ON ${TABLE_NAME}(date)`)
    tablesEnsured = true
  } catch {
    // ignore
  }
}

/**
 * Split array into fixed-size chunks.
 *
 * @param arr Source array
 * @param size Chunk size
 * @returns Chunked arrays
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Write daily records with upsert semantics.
 *
 * @param records Daily records to store
 */
export async function upsertMarketDailyRecords(records: FinanceMarketDailyRecord[]): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  await ensureTable()
  const chunks = chunkArray(records, WRITE_CHUNK_SIZE)
  for (const chunk of chunks) {
    const valuesSql = chunk.map(() => '(?, ?, ?, ?)').join(', ')
    const args: (string | number | bigint | ArrayBuffer | null)[] = []
    for (const rec of chunk) {
      args.push(rec.symbol, rec.date, rec.source, JSON.stringify(rec))
    }
    await db.execute({
      sql: `INSERT OR REPLACE INTO ${TABLE_NAME} (symbol, date, source, payload) VALUES ${valuesSql}`,
      args,
    })
  }
  logger.info('upsertMarketDailyRecords', { count: records.length })
}

/**
 * Insert daily OHLCV/NAV rows only when the primary key `(symbol, date, source)` is absent.
 * Existing rows are left unchanged (no overwrite).
 *
 * @param records Candidate rows to insert
 * @returns Counts for attempted rows, newly inserted rows, and skipped (already present or DB unavailable)
 */
export async function insertMarketDailyRecordsIfNotExists(records: FinanceMarketDailyRecord[]): Promise<{
  attempted: number
  inserted: number
  skipped: number
}> {
  const attempted = records.length
  if (attempted === 0) {
    return { attempted: 0, inserted: 0, skipped: 0 }
  }
  const db = getTursoClient()
  if (!db) {
    logger.warn('insertMarketDailyRecordsIfNotExists skipped — Turso not configured')
    return { attempted, inserted: 0, skipped: attempted }
  }
  await ensureTable()
  let inserted = 0
  const chunks = chunkArray(records, WRITE_CHUNK_SIZE)
  for (const chunk of chunks) {
    const valuesSql = chunk.map(() => '(?, ?, ?, ?)').join(', ')
    const args: (string | number | bigint | ArrayBuffer | null)[] = []
    for (const rec of chunk) {
      args.push(rec.symbol, rec.date, rec.source, JSON.stringify(rec))
    }
    const rs = await db.execute({
      sql: `INSERT OR IGNORE INTO ${TABLE_NAME} (symbol, date, source, payload) VALUES ${valuesSql}`,
      args,
    })
    const affected = typeof (rs as { rowsAffected?: number }).rowsAffected === 'number' ? (rs as { rowsAffected: number }).rowsAffected : 0
    inserted += affected
  }
  const skipped = attempted - inserted
  logger.info('insertMarketDailyRecordsIfNotExists', { attempted, inserted, skipped })
  return { attempted, inserted, skipped }
}

/**
 * Read records by symbols and date range.
 *
 * @param symbols Symbol list
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @returns Ordered daily records
 */
export async function readMarketDailyByRange(symbols: string[], startDate: string, endDate: string): Promise<FinanceMarketDailyRecord[]> {
  if (symbols.length === 0) return []
  const db = getTursoClient()
  if (!db) return []
  await ensureTable()
  const placeholders = symbols.map(() => '?').join(', ')
  const rs = await db.execute({
    sql: `SELECT payload FROM ${TABLE_NAME} WHERE symbol IN (${placeholders}) AND date >= ? AND date <= ? ORDER BY date, symbol`,
    args: [...symbols, startDate, endDate],
  })
  const rows = rs.rows as unknown as { payload: string }[]
  return rows.map((row) => JSON.parse(row.payload) as FinanceMarketDailyRecord)
}

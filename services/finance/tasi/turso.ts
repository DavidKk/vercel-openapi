/**
 * Turso persistence for TASI company daily and market summary.
 * Read/write and 1-year retention. Tables created on first use (IF NOT EXISTS).
 */

import { createLogger } from '@/services/logger'
import { getTursoClient } from '@/services/turso/client'

import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-turso')
const COMPANY_TABLE = 'tasi_company_daily'
const SUMMARY_TABLE = 'tasi_market_summary'
const SUMMARY_HOURLY_TABLE = 'tasi_market_summary_hourly'
const WRITE_CHUNK_SIZE = 80

let tablesEnsured = false

/**
 * Normalize input date to YYYY-MM-DD.
 * @param value Raw date value
 * @returns Normalized date or null when invalid
 */
function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  return trimmed
}

/**
 * Normalize stock code value.
 * @param value Raw code value
 * @returns Uppercased code or null when empty
 */
function normalizeCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.toUpperCase()
}

/**
 * Normalize hourly timestamp to ISO UTC hour precision.
 * @param value Raw timestamp value
 * @returns ISO timestamp (e.g. 2026-04-23T10:00:00.000Z) or null when invalid
 */
function normalizeHourTs(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

/**
 * Split array into fixed-size chunks.
 * @param arr Source array
 * @param size Chunk size
 * @returns Array chunks
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  if (arr.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function ensureTables(): Promise<void> {
  if (tablesEnsured) return
  const db = getTursoClient()
  if (!db) return
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${COMPANY_TABLE} (
        date TEXT NOT NULL,
        code TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (date, code)
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${COMPANY_TABLE}_code_date ON ${COMPANY_TABLE}(code, date)`)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${SUMMARY_TABLE} (
        date TEXT NOT NULL PRIMARY KEY,
        payload TEXT NOT NULL
      )
    `)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${SUMMARY_HOURLY_TABLE} (
        hour_ts TEXT NOT NULL PRIMARY KEY,
        date TEXT NOT NULL,
        payload TEXT NOT NULL
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${SUMMARY_HOURLY_TABLE}_date ON ${SUMMARY_HOURLY_TABLE}(date)`)
    tablesEnsured = true
  } catch {
    // ignore
  }
}

/**
 * Read company daily records for a single date from Turso.
 *
 * @param date YYYY-MM-DD
 * @returns Array of records or empty if not found
 */
export async function readCompanyDailyByDate(date: string): Promise<TasiCompanyDailyRecord[]> {
  const db = getTursoClient()
  if (!db) return []
  await ensureTables()
  const rs = await db.execute({
    sql: `SELECT payload FROM ${COMPANY_TABLE} WHERE date = ? ORDER BY code`,
    args: [date],
  })
  const rows = rs.rows as unknown as { payload: string }[]
  return rows.map((r) => JSON.parse(r.payload) as TasiCompanyDailyRecord)
}

/**
 * Read company K-line: one company, date range.
 *
 * @param code Company code
 * @param fromDate YYYY-MM-DD
 * @param toDate YYYY-MM-DD
 * @returns Array of records ordered by date
 */
export async function readCompanyKline(code: string, fromDate: string, toDate: string): Promise<TasiCompanyDailyRecord[]> {
  const db = getTursoClient()
  if (!db) return []
  await ensureTables()
  const rs = await db.execute({
    sql: `SELECT payload FROM ${COMPANY_TABLE} WHERE code = ? AND date >= ? AND date <= ? ORDER BY date`,
    args: [code, fromDate, toDate],
  })
  const rows = rs.rows as unknown as { payload: string }[]
  return rows.map((r) => JSON.parse(r.payload) as TasiCompanyDailyRecord)
}

/**
 * Read market summary for a single date from Turso.
 *
 * @param date YYYY-MM-DD
 * @returns Summary or null if not found
 */
export async function readSummaryByDate(date: string): Promise<TasiMarketSummary | null> {
  const db = getTursoClient()
  if (!db) return null
  await ensureTables()
  const rs = await db.execute({
    sql: `SELECT payload FROM ${SUMMARY_TABLE} WHERE date = ?`,
    args: [date],
  })
  const row = rs.rows[0] as unknown as { payload: string } | undefined
  if (!row) return null
  return JSON.parse(row.payload) as TasiMarketSummary
}

/**
 * Read market K-line: date range.
 *
 * @param fromDate YYYY-MM-DD
 * @param toDate YYYY-MM-DD
 * @returns Array of summaries ordered by date
 */
export async function readSummaryKline(fromDate: string, toDate: string): Promise<TasiMarketSummary[]> {
  const db = getTursoClient()
  if (!db) return []
  await ensureTables()
  const rs = await db.execute({
    sql: `SELECT payload FROM ${SUMMARY_TABLE} WHERE date >= ? AND date <= ? ORDER BY date`,
    args: [fromDate, toDate],
  })
  const rows = rs.rows as unknown as { payload: string }[]
  return rows.map((r) => JSON.parse(r.payload) as TasiMarketSummary)
}

/**
 * Write company daily records for one date (replace existing for that date).
 *
 * @param date YYYY-MM-DD
 * @param records Company daily records
 */
export async function writeCompanyDaily(date: string, records: TasiCompanyDailyRecord[]): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  await ensureTables()
  const normalizedDate = normalizeDate(date)
  if (!normalizedDate) {
    logger.warn('writeCompanyDaily skipped: invalid date', { date })
    return
  }

  const seenCodes = new Set<string>()
  let inserted = 0
  let skipped = 0
  const rows: Array<{ code: string; payload: string }> = []
  for (const rec of records) {
    const code = normalizeCode(rec.code)
    if (!code || seenCodes.has(code)) {
      skipped += 1
      continue
    }
    seenCodes.add(code)
    rows.push({ code, payload: JSON.stringify(rec) })
  }

  const chunks = chunkArray(rows, WRITE_CHUNK_SIZE)
  for (const chunk of chunks) {
    const valuesSql = chunk.map(() => '(?, ?, ?)').join(', ')
    const args: (string | number | bigint | ArrayBuffer | null)[] = []
    for (const row of chunk) {
      args.push(normalizedDate, row.code, row.payload)
    }
    await db.execute({
      sql: `INSERT OR REPLACE INTO ${COMPANY_TABLE} (date, code, payload) VALUES ${valuesSql}`,
      args,
    })
    inserted += chunk.length
  }
  logger.info('writeCompanyDaily', { date: normalizedDate, count: records.length, inserted, skipped })
}

/**
 * Write market summary for one date.
 *
 * @param date YYYY-MM-DD
 * @param summary Market summary
 */
export async function writeSummary(date: string, summary: TasiMarketSummary): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  await ensureTables()
  const normalizedDate = normalizeDate(date)
  if (!normalizedDate) {
    logger.warn('writeSummary skipped: invalid date', { date })
    return
  }
  const payload = JSON.stringify(summary)
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${SUMMARY_TABLE} (date, payload) VALUES (?, ?)`,
    args: [normalizedDate, payload],
  })
  logger.info('writeSummary', { date: normalizedDate })
}

/**
 * Write market summary hourly snapshot for one hour.
 *
 * @param hourTs ISO timestamp (UTC, any minute/second accepted; normalized to hour)
 * @param summary Market summary payload
 */
export async function writeSummaryHourly(hourTs: string, summary: TasiMarketSummary): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  await ensureTables()
  const normalizedHourTs = normalizeHourTs(hourTs)
  if (!normalizedHourTs) {
    logger.warn('writeSummaryHourly skipped: invalid hourTs', { hourTs })
    return
  }
  const date = normalizedHourTs.slice(0, 10)
  const payload = JSON.stringify(summary)
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${SUMMARY_HOURLY_TABLE} (hour_ts, date, payload) VALUES (?, ?, ?)`,
    args: [normalizedHourTs, date, payload],
  })
  logger.info('writeSummaryHourly', { hourTs: normalizedHourTs, date })
}

/** Retention: keep 1 year of data; delete rows with date strictly before cutoff. */
const RETENTION_DAYS = 365

/**
 * Delete TASI data older than retention (1 year). Call from cron after write.
 */
export async function deleteOlderThanRetention(): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - RETENTION_DAYS)
  const cutoff = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  await ensureTables()
  await db.execute({ sql: `DELETE FROM ${COMPANY_TABLE} WHERE date < ?`, args: [cutoff] })
  await db.execute({ sql: `DELETE FROM ${SUMMARY_TABLE} WHERE date < ?`, args: [cutoff] })
  await db.execute({ sql: `DELETE FROM ${SUMMARY_HOURLY_TABLE} WHERE hour_ts < ?`, args: [`${cutoff}T00:00:00.000Z`] })
  logger.info('deleteOlderThanRetention', { cutoff })
}

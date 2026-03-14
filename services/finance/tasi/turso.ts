/**
 * Turso persistence for TASI company daily and market summary.
 * Read/write and 2-year retention. Tables created on first use (IF NOT EXISTS).
 */

import { createLogger } from '@/services/logger'
import { getTursoClient } from '@/services/turso/client'

import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-turso')
const COMPANY_TABLE = 'tasi_company_daily'
const SUMMARY_TABLE = 'tasi_market_summary'

let tablesEnsured = false

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
  await db.execute({ sql: `DELETE FROM ${COMPANY_TABLE} WHERE date = ?`, args: [date] })
  for (const rec of records) {
    const code = rec.code ?? ''
    const payload = JSON.stringify(rec)
    await db.execute({
      sql: `INSERT INTO ${COMPANY_TABLE} (date, code, payload) VALUES (?, ?, ?)`,
      args: [date, code, payload],
    })
  }
  logger.info('writeCompanyDaily', { date, count: records.length })
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
  const payload = JSON.stringify(summary)
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${SUMMARY_TABLE} (date, payload) VALUES (?, ?)`,
    args: [date, payload],
  })
  logger.info('writeSummary', { date })
}

/** Retention: keep 2 years of data; delete rows with date strictly before cutoff. */
const RETENTION_DAYS = 365 * 2

/**
 * Delete TASI data older than retention (2 years). Call from cron after write.
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
  logger.info('deleteOlderThanRetention', { cutoff })
}

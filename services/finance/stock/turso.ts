import { createLogger } from '@/services/logger'
import { getTursoClient } from '@/services/turso/client'

import type { StockMarket, StockMarketSummary } from './types'

const logger = createLogger('finance-stock-turso')
const TABLE_NAME = 'finance_stock_summary_daily'
let tablesEnsured = false

/**
 * Ensure stock summary table exists.
 */
async function ensureTable(): Promise<void> {
  if (tablesEnsured) return
  const db = getTursoClient()
  if (!db) return
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        market TEXT NOT NULL,
        date TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (market, date)
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_date ON ${TABLE_NAME}(date)`)
    tablesEnsured = true
  } catch {
    // ignore
  }
}

/**
 * Upsert daily market summary.
 *
 * @param summary Summary payload
 */
export async function upsertStockSummaryDaily(summary: StockMarketSummary): Promise<void> {
  const db = getTursoClient()
  if (!db) return
  await ensureTable()
  await db.execute({
    sql: `INSERT OR REPLACE INTO ${TABLE_NAME} (market, date, payload) VALUES (?, ?, ?)`,
    args: [summary.market, summary.date, JSON.stringify(summary)],
  })
  logger.info('upsertStockSummaryDaily', { market: summary.market, date: summary.date })
}

/**
 * Read latest summary for one market.
 *
 * @param market Market name
 * @returns Latest summary or null
 */
export async function readLatestStockSummary(market: StockMarket): Promise<StockMarketSummary | null> {
  const db = getTursoClient()
  if (!db) return null
  await ensureTable()
  const rs = await db.execute({
    sql: `SELECT payload FROM ${TABLE_NAME} WHERE market = ? ORDER BY date DESC LIMIT 1`,
    args: [market],
  })
  const row = rs.rows[0] as unknown as { payload: string } | undefined
  if (!row) return null
  return JSON.parse(row.payload) as StockMarketSummary
}

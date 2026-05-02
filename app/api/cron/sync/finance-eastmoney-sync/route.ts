import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'

import { parseEastmoneyDailySyncCategory, runMarketDailySyncCron } from '../runMarketDailySync'

export const runtime = 'nodejs'

const logger = createLogger('cron-finance-eastmoney-sync')

/**
 * Eastmoney daily OHLCV ingest into Turso (CN fund/ETF six-digit bars + XAUUSD spot).
 * Query:
 * - `category`: `fund` | `precious` | `all` / omit (default: fund + XAUUSD).
 * - `symbols`: optional comma-separated override.
 * - `FINANCE_MARKET_SYMBOLS` when `symbols` is empty (same override for all categories; use explicit `?symbols=` if env is mixed).
 * - `startDate` + `endDate`: optional YYYY-MM-DD range backfill.
 * Auth: CRON_SECRET (Bearer or ?secret=).
 */
export const GET = cron(async (_req, ctx) => {
  const categoryRaw = ctx.searchParams.get('category')
  const preset = parseEastmoneyDailySyncCategory(categoryRaw)
  if (preset == null) {
    return jsonInvalidParameters('Invalid category. Use fund, precious, or all (omit for all).', {
      headers: cacheControlNoStoreHeaders(),
    })
  }
  const symbolsRaw = (ctx.searchParams.get('symbols') ?? '').trim()
  const startDate = (ctx.searchParams.get('startDate') ?? '').trim()
  const endDate = (ctx.searchParams.get('endDate') ?? '').trim()
  logger.info('finance-eastmoney-sync start', { category: categoryRaw ?? '(default all)', preset, symbolsRaw, startDate, endDate })
  const result = await runMarketDailySyncCron({
    symbolsRaw,
    envSymbolsRaw: process.env.FINANCE_MARKET_SYMBOLS,
    preset,
    startDate,
    endDate,
  })
  logger.info('finance-eastmoney-sync done', { preset, result })
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

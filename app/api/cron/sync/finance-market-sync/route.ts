import { FUND_ETF_OHLCV_SYMBOLS } from '@/app/finance/constants/fundEtfOhlcv'
import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { runMarketDailyIngest, runMarketDailyIngestRange } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-finance-market-sync')

/**
 * GET /api/cron/sync/finance-market-sync
 * Query:
 * - symbols: optional comma-separated six-digit symbols
 *   fallback to env FINANCE_MARKET_SYMBOLS, then all Fund/ETF OHLCV tickers from the Finance UI allowlist
 * - startDate/endDate: optional YYYY-MM-DD (when both provided, run range backfill mode)
 */
export const GET = cron(async (_req, ctx) => {
  const defaultSymbols = FUND_ETF_OHLCV_SYMBOLS.join(',')
  const symbolsRaw = (ctx.searchParams.get('symbols') ?? process.env.FINANCE_MARKET_SYMBOLS ?? defaultSymbols).trim()
  const startDate = (ctx.searchParams.get('startDate') ?? '').trim()
  const endDate = (ctx.searchParams.get('endDate') ?? '').trim()
  const symbols = symbolsRaw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const isRangeMode = startDate !== '' && endDate !== ''
  logger.info('finance-market-sync start', { symbols, startDate, endDate, isRangeMode })
  const result = isRangeMode ? await runMarketDailyIngestRange({ symbols, startDate, endDate }) : await runMarketDailyIngest(symbols)
  logger.info('finance-market-sync done', result)
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

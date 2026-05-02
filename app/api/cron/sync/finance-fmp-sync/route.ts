import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { parseStockMarket, runStockSummaryIngest, STOCK_MARKETS } from '@/services/finance/stock'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-finance-fmp-sync')

/**
 * FMP (Financial Modeling Prep) multi-market index/stock summary ingest for non-TASI Finance markets.
 * Query: optional `markets` (comma-separated names); defaults to full configured market list.
 * For TASI use `finance-tasi-sync`. For Eastmoney daily OHLCV use `finance-eastmoney-sync`.
 *
 * @returns Ingest execution result
 */
export const GET = cron(async (_req, ctx) => {
  const marketsParam = ctx.searchParams.get('markets')?.trim() ?? ''
  const markets = marketsParam
    ? marketsParam
        .split(',')
        .map((v) => v.trim())
        .map((v) => parseStockMarket(v))
        .filter((v): v is (typeof STOCK_MARKETS)[number] => v != null)
    : STOCK_MARKETS

  logger.info('finance-fmp-sync start', { markets })
  const result = await runStockSummaryIngest(markets)
  logger.info('finance-fmp-sync done', { markets, result })
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

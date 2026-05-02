import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { parseStockMarket, runStockSummaryIngest, STOCK_MARKETS } from '@/services/finance/stock'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-finance-stock-sync')

/**
 * Stock summary sync cron.
 * Supports optional `markets` query parameter (comma separated names).
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

  logger.info('finance-stock-sync cron start', { markets })
  const result = await runStockSummaryIngest(markets)
  logger.info('finance-stock-sync cron done', { markets, result })
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

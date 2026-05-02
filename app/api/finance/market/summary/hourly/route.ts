import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { parseStockMarket } from '@/services/finance/stock'
import { getTasiSummaryHourlyAlignment } from '@/services/finance/tasi/hourly-summary'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-market-summary-hourly')

/**
 * GET /api/finance/market/summary/hourly
 * Generic `market` query (default TASI). **Only TASI is supported** for this endpoint today; other markets return 400.
 * No other query params. SAHMK vs daily-summary field alignment (requires SAHMK_API_KEY server-side).
 */
export const GET = api(async (_req, ctx) => {
  const marketRaw = ctx.searchParams.get('market') ?? 'TASI'
  const market = parseStockMarket(marketRaw.trim())
  if (!market || market !== 'TASI') {
    return jsonInvalidParameters('Only market=TASI is supported for hourly summary alignment on this path (SAHMK vs daily summary).')
  }
  logger.info('request hourly summary alignment', { market })
  const result = await getTasiSummaryHourlyAlignment()
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

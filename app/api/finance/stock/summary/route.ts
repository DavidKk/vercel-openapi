import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { getStockSummary, getStockSummaryBatch, parseStockMarket, type StockMarket } from '@/services/finance/stock'

export const runtime = 'nodejs'

const summaryCacheHeaders = new Headers({
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
})

/**
 * GET /api/finance/stock/summary
 * Standard envelope: `{ code, message, data }` with HTTP 200 on success.
 * Single: `data: { market, summary }`. Batch (`markets=`): `data: { items }`.
 */
export const GET = api(async (_req, ctx) => {
  const marketsRaw = ctx.searchParams.get('markets')?.trim() ?? ''
  if (marketsRaw) {
    const markets = marketsRaw
      .split(',')
      .map((value) => value.trim())
      .map((value) => parseStockMarket(value))
      .filter((value): value is StockMarket => value != null)
    if (markets.length === 0) {
      return jsonInvalidParameters('Invalid markets query (no recognized market names).', { headers: cacheControlNoStoreHeaders() })
    }
    try {
      const items = await getStockSummaryBatch(markets)
      return jsonSuccess({ items }, { headers: summaryCacheHeaders })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return standardResponseError(message).toJsonResponse(500, { headers: cacheControlNoStoreHeaders() })
    }
  }

  const marketRaw = ctx.searchParams.get('market')?.trim() ?? 'TASI'
  const market = parseStockMarket(marketRaw)
  if (!market) {
    return jsonInvalidParameters('Invalid market query.', { headers: cacheControlNoStoreHeaders() })
  }

  try {
    const summary = await getStockSummary(market)
    return jsonSuccess({ market, summary }, { headers: summaryCacheHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return standardResponseError(message).toJsonResponse(500, { headers: cacheControlNoStoreHeaders() })
  }
})

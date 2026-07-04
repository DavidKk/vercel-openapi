import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess, standardResponseError } from '@/initializer/response'
import { getStockSummaryDaily, parseStockMarket } from '@/services/finance/stock'

export const runtime = 'nodejs'

const summaryCacheHeaders = new Headers({
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
})

/**
 * GET /api/finance/stock/summary/daily
 * Daily index summary for one market. No date params → latest (same as GET /api/finance/stock/summary?market=…).
 * Query: market (default TASI); optional date (single day) or from+to (range, max 365 days).
 */
export const GET = api(async (_req, ctx) => {
  const marketRaw = ctx.searchParams.get('market')?.trim() ?? 'TASI'
  const market = parseStockMarket(marketRaw)
  if (!market) {
    return jsonInvalidParameters('Invalid market query.', { headers: cacheControlNoStoreHeaders() })
  }

  const date = ctx.searchParams.get('date')?.trim() ?? undefined
  const from = ctx.searchParams.get('from')?.trim() ?? undefined
  const to = ctx.searchParams.get('to')?.trim() ?? undefined

  if (date && (from || to)) {
    return jsonInvalidParameters('Use date OR from+to, not both.', { headers: cacheControlNoStoreHeaders() })
  }
  if ((from && !to) || (!from && to)) {
    return jsonInvalidParameters('from and to must be provided together.', { headers: cacheControlNoStoreHeaders() })
  }

  try {
    if (from && to) {
      const items = await getStockSummaryDaily(market, { from, to })
      const list = Array.isArray(items) ? items : []
      return jsonSuccess({ market, items: list }, { headers: summaryCacheHeaders })
    }

    const summary = await getStockSummaryDaily(market, date ? { date } : {})
    if (Array.isArray(summary)) {
      return jsonSuccess({ market, items: summary }, { headers: summaryCacheHeaders })
    }
    return jsonSuccess({ market, summary }, { headers: summaryCacheHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return standardResponseError(message).toJsonResponse(500, { headers: cacheControlNoStoreHeaders() })
  }
})

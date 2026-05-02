import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { parseStockMarket } from '@/services/finance/stock'
import { getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-market-summary-daily')

/**
 * GET /api/finance/market/summary/daily
 * Generic `market` query (default TASI). **Only TASI is supported** today (feed + Turso / K-line); other markets → GET /api/finance/stock/summary?market=...
 * Query: date | from & to — same semantics as legacy GET /api/finance/tasi/summary/daily.
 */
export const GET = api(async (_req, ctx) => {
  const marketRaw = ctx.searchParams.get('market') ?? 'TASI'
  const market = parseStockMarket(marketRaw.trim())
  if (!market || market !== 'TASI') {
    return jsonInvalidParameters(
      'Only market=TASI is supported on this path (feed/Turso index summary and K-line). For S&P 500, Dow Jones, Nasdaq, etc., use GET /api/finance/stock/summary?market=<name>.'
    )
  }
  const date = ctx.searchParams.get('date') ?? undefined
  const from = ctx.searchParams.get('from') ?? undefined
  const to = ctx.searchParams.get('to') ?? undefined
  logger.info('request', { market, date, from, to })

  const data = await getSummaryDaily({ date, from, to })
  return jsonSuccess(data, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

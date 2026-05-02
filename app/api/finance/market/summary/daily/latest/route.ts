import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { parseStockMarket } from '@/services/finance/stock'
import { getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-market-summary-daily-latest')

/**
 * GET /api/finance/market/summary/daily/latest
 * TASI index summary for the latest available session (same payload as no-date summary/daily) plus asOf timestamp.
 */
export const GET = api(async (_req, ctx) => {
  const marketRaw = ctx.searchParams.get('market') ?? 'TASI'
  const market = parseStockMarket(marketRaw.trim())
  if (!market || market !== 'TASI') {
    return jsonInvalidParameters('Only market=TASI is supported on this path. For other overview indices use GET /api/finance/stock/summary.')
  }
  logger.info('request', { market })

  const asOf = new Date().toISOString()
  const summary = await getSummaryDaily({})
  const dataDate = summary != null && !Array.isArray(summary) ? summary.date : null

  return jsonSuccess(
    { asOf, dataDate, summary },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

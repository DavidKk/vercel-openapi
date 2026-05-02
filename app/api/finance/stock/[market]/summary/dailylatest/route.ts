import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-summary-dailylatest')

/**
 * GET /api/finance/stock/:market/summary/dailylatest
 * Latest TASI index session + asOf (slug must be `tasi`). Same data as GET /api/finance/market/summary/daily/latest?market=TASI.
 */
export const GET = api<{ market: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const slugErr = tasiFeedSlugErrorMessage(params.market)
  if (slugErr) {
    return jsonInvalidParameters(slugErr)
  }
  logger.info('request', { slug: params.market })

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

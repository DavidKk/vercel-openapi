import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-daily-latest')

/**
 * GET /api/finance/stock/:market/daily/latest
 * Deprecated combined snapshot (summary + companies). Prefer GET /api/finance/stock/summary?market=TASI for latest index.
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
    { asOf, dataDate, summary, items: [] },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

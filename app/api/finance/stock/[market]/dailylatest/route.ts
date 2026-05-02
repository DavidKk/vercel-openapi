import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getCompanyDaily, getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-dailylatest')

/**
 * GET /api/finance/stock/:market/dailylatest
 * Single-call latest snapshot for the stock market page: index summary + all companies (slug must be `tasi`).
 */
export const GET = api<{ market: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const slugErr = tasiFeedSlugErrorMessage(params.market)
  if (slugErr) {
    return jsonInvalidParameters(slugErr)
  }
  logger.info('request', { slug: params.market })

  const asOf = new Date().toISOString()
  const [summary, items] = await Promise.all([getSummaryDaily({}), getCompanyDaily({})])
  const dataDate = summary != null && !Array.isArray(summary) ? summary.date : (items[0]?.date ?? null)

  return jsonSuccess(
    { asOf, dataDate, summary, items },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

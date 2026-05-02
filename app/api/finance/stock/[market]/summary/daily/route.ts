import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-summary-daily')

/**
 * GET /api/finance/stock/:market/summary/daily
 * Mirrors `/finance/stock/:slug` — TASI exchange index daily / K-line (slug must be `tasi`).
 * Query: same as GET /api/finance/market/summary/daily (date | from & to).
 */
export const GET = api<{ market: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const slugErr = tasiFeedSlugErrorMessage(params.market)
  if (slugErr) {
    return jsonInvalidParameters(slugErr)
  }
  const date = ctx.searchParams.get('date') ?? undefined
  const from = ctx.searchParams.get('from') ?? undefined
  const to = ctx.searchParams.get('to') ?? undefined
  logger.info('request', { slug: params.market, date, from, to })

  const data = await getSummaryDaily({ date, from, to })
  return jsonSuccess(data, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

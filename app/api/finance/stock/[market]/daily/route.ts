import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getCompanyDaily, getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-daily')

/**
 * GET /api/finance/stock/:market/daily
 * Daily merged payload for the stock market page: index summary + company rows (slug must be `tasi`).
 * Query:
 * - date: single trading day
 * - from/to: range query
 * - code: optional company code filter (applies to company rows only)
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
  const code = ctx.searchParams.get('code') ?? undefined
  logger.info('request', { slug: params.market, date, from, to, code })

  const [summary, items] = await Promise.all([getSummaryDaily({ date, from, to }), getCompanyDaily({ date, from, to, code })])

  return jsonSuccess(
    { summary, items },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

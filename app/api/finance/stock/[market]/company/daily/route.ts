import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getCompanyDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-company-daily')

/**
 * GET /api/finance/stock/:market/company/daily
 * Mirrors `/finance/stock/:slug` — TASI constituents (slug must be `tasi`).
 * Query: same as GET /api/finance/market/company/daily.
 */
export const GET = api<{ market: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const slugErr = tasiFeedSlugErrorMessage(params.market)
  if (slugErr) {
    return jsonInvalidParameters(slugErr)
  }
  const date = ctx.searchParams.get('date') ?? undefined
  const code = ctx.searchParams.get('code') ?? undefined
  const from = ctx.searchParams.get('from') ?? undefined
  const to = ctx.searchParams.get('to') ?? undefined
  logger.info('request', { slug: params.market, date, code, from, to })

  const list = await getCompanyDaily({ date, code, from, to })
  return jsonSuccess(list, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

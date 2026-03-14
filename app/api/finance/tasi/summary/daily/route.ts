import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getSummaryDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-tasi-summary-daily')

/**
 * GET /api/finance/tasi/summary/daily
 * Today: from cf-feed-bridge. History: from Turso.
 * Query: (none) = today | date=YYYY-MM-DD | from=...&to=... for K-line.
 */
export const GET = api(async (req, ctx) => {
  const date = ctx.searchParams.get('date') ?? undefined
  const from = ctx.searchParams.get('from') ?? undefined
  const to = ctx.searchParams.get('to') ?? undefined
  logger.info('request', { date, from, to })

  const data = await getSummaryDaily({ date, from, to })
  return jsonSuccess(data, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

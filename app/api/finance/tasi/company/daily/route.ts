import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getCompanyDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-tasi-company-daily')

/**
 * GET /api/finance/tasi/company/daily
 * Today: from cf-feed-bridge. History: from Turso.
 * Query: (none) = today all companies | date=YYYY-MM-DD | code=xxx&from=...&to=... for K-line.
 */
export const GET = api(async (req, ctx) => {
  const date = ctx.searchParams.get('date') ?? undefined
  const code = ctx.searchParams.get('code') ?? undefined
  const from = ctx.searchParams.get('from') ?? undefined
  const to = ctx.searchParams.get('to') ?? undefined
  logger.info('request', { date, code, from, to })

  const list = await getCompanyDaily({ date, code, from, to })
  return jsonSuccess(list, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

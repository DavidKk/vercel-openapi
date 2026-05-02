import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { parseStockMarket } from '@/services/finance/stock'
import { getCompanyDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-market-company-daily')

/**
 * GET /api/finance/market/company/daily
 * Generic `market` query (default TASI). **Only TASI is supported** today; other values return 400.
 * Query: (none) | date | code+from+to — same semantics as legacy GET /api/finance/tasi/company/daily.
 */
export const GET = api(async (_req, ctx) => {
  const marketRaw = ctx.searchParams.get('market') ?? 'TASI'
  const market = parseStockMarket(marketRaw.trim())
  if (!market || market !== 'TASI') {
    return jsonInvalidParameters('Only market=TASI is supported on this path (Saudi company daily from feed/Turso).')
  }
  const date = ctx.searchParams.get('date') ?? undefined
  const code = ctx.searchParams.get('code') ?? undefined
  const from = ctx.searchParams.get('from') ?? undefined
  const to = ctx.searchParams.get('to') ?? undefined
  logger.info('request', { market, date, code, from, to })

  const list = await getCompanyDaily({ date, code, from, to })
  return jsonSuccess(list, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})

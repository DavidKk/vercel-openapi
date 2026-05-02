import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { parseStockMarket } from '@/services/finance/stock'
import { getCompanyDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-market-company-daily-latest')

/**
 * GET /api/finance/market/company/daily/latest
 * TASI all-company snapshot for the latest available session (same as company/daily with no extra params) plus asOf timestamp.
 */
export const GET = api(async (_req, ctx) => {
  const marketRaw = ctx.searchParams.get('market') ?? 'TASI'
  const market = parseStockMarket(marketRaw.trim())
  if (!market || market !== 'TASI') {
    return jsonInvalidParameters('Only market=TASI is supported on this path.')
  }
  logger.info('request', { market })

  const asOf = new Date().toISOString()
  const items = await getCompanyDaily({})
  const dataDate = items[0]?.date ?? null

  return jsonSuccess(
    { asOf, dataDate, items },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

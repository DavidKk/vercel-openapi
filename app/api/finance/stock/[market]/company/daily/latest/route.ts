import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { tasiCompanyDailyLatestGuard } from '@/app/api/finance/stock/tasiCompanyDailyGuard'
import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getCompanyDaily } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-finance-stock-slug-company-daily-latest')

/**
 * GET /api/finance/stock/:market/company/daily/latest
 * Latest TASI company list + asOf (slug must be `tasi`). Same data as GET /api/finance/market/company/daily/latest?market=TASI.
 */
export const GET = api<{ market: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const slugErr = tasiFeedSlugErrorMessage(params.market)
  if (slugErr) {
    return jsonInvalidParameters(slugErr)
  }
  logger.info('request', { slug: params.market })

  const blocked = tasiCompanyDailyLatestGuard()
  if (blocked) return blocked

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

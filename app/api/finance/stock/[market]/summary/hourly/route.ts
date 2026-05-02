import { tasiFeedSlugErrorMessage } from '@/app/api/finance/stock/stockSlugTasiFeed'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getTasiSummaryHourlyAlignment } from '@/services/finance/tasi/hourly-summary'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-stock-slug-summary-hourly')

/**
 * GET /api/finance/stock/:market/summary/hourly
 * Mirrors `/finance/stock/:slug` — TASI SAHMK hourly alignment (slug must be `tasi`).
 */
export const GET = api<{ market: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const slugErr = tasiFeedSlugErrorMessage(params.market)
  if (slugErr) {
    return jsonInvalidParameters(slugErr, { headers: cacheControlNoStoreHeaders() })
  }
  logger.info('request hourly summary alignment', { slug: params.market })
  const result = await getTasiSummaryHourlyAlignment()
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

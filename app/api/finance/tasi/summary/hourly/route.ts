import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { getTasiSummaryHourlyAlignment } from '@/services/finance/tasi/hourly-summary'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-tasi-summary-hourly')

/**
 * GET /api/finance/tasi/summary/hourly
 * Fetch SAHMK market summary (TASI), map to current summary shape, and compare with existing daily summary for field alignment.
 */
export const GET = api(async () => {
  logger.info('request hourly summary alignment')
  const result = await getTasiSummaryHourlyAlignment()
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

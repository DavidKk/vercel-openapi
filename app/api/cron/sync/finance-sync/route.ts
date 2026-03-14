import { cron } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { runIngest } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-tasi-sync')

/**
 * Finance (TASI) sync cron: writes DB (Turso) then GIST.
 * Fetches today from cf-feed-bridge, compares with GIST; if changed writes Turso, runs 2-year retention, then writes GIST.
 * Auth: CRON_SECRET (Bearer or ?secret=). Requires GIST_ID, GIST_TOKEN, TASI_FEED_URL, TURSO_*.
 */
export const GET = cron(async () => {
  logger.info('tasi-sync cron start')
  const result = await runIngest()
  logger.info('tasi-sync cron done', result)
  return jsonSuccess(result)
})

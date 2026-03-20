import { cron } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { runIngest } from '@/services/finance/tasi'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-tasi-sync')

/**
 * Finance (TASI) sync cron: writes DB (Turso) then KV snapshot.
 * Fetches today from cf-feed-bridge, compares with KV snapshot; if changed writes Turso, runs 2-year retention, then updates KV snapshot.
 * Auth: CRON_SECRET (Bearer or ?secret=). Requires TASI_FEED_URL, TURSO_*.
 */
export const GET = cron(async () => {
  logger.info('tasi-sync cron start')
  const result = await runIngest()
  logger.info('tasi-sync cron done', result)
  return jsonSuccess(result)
})

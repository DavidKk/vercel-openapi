import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { runIngest } from '@/services/finance/tasi'
import { runIngestHourlySummary } from '@/services/finance/tasi/hourly-summary'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-tasi-sync')

/**
 * Finance (TASI) sync cron with dual modes:
 * - mode=daily (default): existing daily ingest (bridge -> Turso/KV).
 * - mode=hourly: SAHMK hourly summary ingest (writes hourly table only).
 * Auth: CRON_SECRET (Bearer or ?secret=).
 */
export const GET = cron(async (_req, ctx) => {
  const mode = ctx.searchParams.get('mode') === 'hourly' ? 'hourly' : 'daily'
  logger.info('tasi-sync cron start', { mode })
  const result = mode === 'hourly' ? await runIngestHourlySummary() : await runIngest()
  logger.info('tasi-sync cron done', { mode, result })
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

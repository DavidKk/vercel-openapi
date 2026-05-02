import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { runIngest } from '@/services/finance/tasi'
import { runIngestHourlySummary } from '@/services/finance/tasi/hourly-summary'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('cron-finance-tasi-sync')

/**
 * TASI (Saudi exchange) daily or hourly ingest: cf-feed-bridge → Turso/KV, plus optional SAHMK hourly alignment.
 * Query: `mode=daily` (default) or `mode=hourly`.
 * For FMP multi-market summaries use sibling `finance-fmp-sync`. For Eastmoney OHLCV use `finance-eastmoney-sync`.
 * Auth: CRON_SECRET (Bearer or ?secret=).
 */
export const GET = cron(async (_req, ctx) => {
  const mode = ctx.searchParams.get('mode') === 'hourly' ? 'hourly' : 'daily'
  logger.info('finance-tasi-sync start', { mode })
  const result = mode === 'hourly' ? await runIngestHourlySummary() : await runIngest()
  logger.info('finance-tasi-sync done', { mode, result })
  return jsonSuccess(result, { headers: cacheControlNoStoreHeaders() })
})

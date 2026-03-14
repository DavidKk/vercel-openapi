import { cron } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { getMoviesListWithAutoUpdate } from '@/services/movies'

export const runtime = 'nodejs'

const logger = createLogger('cron-movies-gist')

/**
 * Movies GIST sync cron job.
 * Refreshes movies cache (Maoyan + TMDB → GIST). Call from external cron (e.g. GitHub Actions)
 * at e.g. UTC 04:00, 12:00, 20:00.
 * Auth: cron() wrapper enforces CRON_SECRET (Bearer or ?secret=).
 */
export const GET = cron(async () => {
  logger.info('movies-gist sync start')
  const movies = await getMoviesListWithAutoUpdate()
  logger.info('movies-gist sync done', { count: movies.length })
  return jsonSuccess({ ok: true, count: movies.length })
})

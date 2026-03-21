import { cron } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import type { MergedMovie } from '@/services/maoyan/types'
import { getMoviesListWithAutoUpdate } from '@/services/movies'

export const runtime = 'nodejs'

const logger = createLogger('cron-movies-gist')

/**
 * Count movies by source (Maoyan topRated/mostExpected, TMDB popular/upcoming).
 * A movie can have multiple sources.
 */
function getSourceSummary(movies: MergedMovie[]): { topRated: number; mostExpected: number; tmdbPopular: number; tmdbUpcoming: number } {
  let topRated = 0
  let mostExpected = 0
  let tmdbPopular = 0
  let tmdbUpcoming = 0
  for (const m of movies) {
    if (m.sources?.includes('topRated')) topRated++
    if (m.sources?.includes('mostExpected')) mostExpected++
    if (m.sources?.includes('tmdbPopular')) tmdbPopular++
    if (m.sources?.includes('tmdbUpcoming')) tmdbUpcoming++
  }
  return { topRated, mostExpected, tmdbPopular, tmdbUpcoming }
}

/**
 * Movies GIST sync cron job.
 * Refreshes movies cache (Maoyan only → GIST). Call from external cron (e.g. GitHub Actions)
 * at e.g. UTC 04:00, 12:00, 20:00.
 * Auth: cron() wrapper enforces CRON_SECRET (Bearer or ?secret=).
 * Query: ?force=1 to force refresh (ignore cache freshness).
 */
export const GET = cron(async (_req, context) => {
  const force = context.searchParams.get('force') === '1'
  logger.info('movies-gist sync start (Maoyan apis.netstart.cn → GIST)', { forceRefresh: force })
  const movies = await getMoviesListWithAutoUpdate({ forceRefresh: force })
  const summary = getSourceSummary(movies)
  logger.info('movies-gist sync done', {
    count: movies.length,
    sources: {
      maoyanTopRated: summary.topRated,
      maoyanMostExpected: summary.mostExpected,
      tmdbPopular: summary.tmdbPopular,
      tmdbUpcoming: summary.tmdbUpcoming,
    },
  })
  return jsonSuccess({ ok: true, count: movies.length, sources: summary }, { headers: cacheControlNoStoreHeaders() })
})

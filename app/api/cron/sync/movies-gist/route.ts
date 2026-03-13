import { cron } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getMoviesListWithAutoUpdate } from '@/services/movies'

export const runtime = 'nodejs'

/**
 * Movies GIST sync cron job.
 * Refreshes movies cache (Maoyan + TMDB → GIST). Call from external cron (e.g. GitHub Actions)
 * at e.g. UTC 04:00, 12:00, 20:00.
 * Auth: cron() wrapper enforces CRON_SECRET (Bearer or ?secret=).
 */
export const GET = cron(async () => {
  const movies = await getMoviesListWithAutoUpdate()
  return jsonSuccess({ ok: true, count: movies.length })
})

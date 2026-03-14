import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { getMoviesListWithTimestamp } from '@/services/movies'

export const runtime = 'edge'

const logger = createLogger('api-movies')

/**
 * GET /api/movies – returns latest movies from cache (GIST). No auth. Read-only; does not trigger TMDB/Maoyan.
 */
export const GET = api(async () => {
  logger.info('request')
  const { movies, cachedAt } = await getMoviesListWithTimestamp()
  return jsonSuccess(
    { movies, cachedAt },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

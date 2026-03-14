import { createLogger } from '@/services/logger'
import type { GetMergedMoviesListOptions } from '@/services/maoyan'
import { getMergedMoviesListWithoutCache } from '@/services/maoyan'
import type { MergedMovie } from '@/services/maoyan/types'

import { createInitialCacheData, getMoviesFromGist, getResultFromCache, saveMoviesToGist, setResultToCache, shouldUpdate, updateCacheData } from './cache'
import type { MoviesCacheData } from './types'

const logger = createLogger('movies')

export { createInitialCacheData, getMoviesFromGist, getResultFromCache, setResultToCache, shouldUpdate, updateCacheData } from './cache'
export type { MoviesCacheData } from './types'

/**
 * Read-only: get movies from cache (memory or GIST). Never triggers upstream API.
 * @returns Cached movies or empty array
 */
export async function getMoviesListFromCache(): Promise<MergedMovie[]> {
  const cached = getResultFromCache()
  if (cached) return cached
  try {
    const data = await getMoviesFromGist()
    if (data?.data?.movies) {
      setResultToCache(data.data.movies)
      return data.data.movies
    }
  } catch {
    // return empty
  }
  return []
}

/** In-memory cached timestamp when we have result cache (optional) */
let cachedTimestamp = 0

/**
 * Get movies list and cache timestamp for API response.
 * Aligned with veil: use cache when present; updates only via cron.
 * - Has data (memory or GIST): return it; do not refresh. Cron handles updates.
 * - No data: trigger a one-shot fetch to bootstrap cache, then return (or empty on failure).
 * Returns { movies, cachedAt }; cachedAt is 0 when no cache.
 */
export async function getMoviesListWithTimestamp(): Promise<{
  movies: MergedMovie[]
  cachedAt: number
}> {
  const fromMemory = getResultFromCache()
  if (fromMemory && fromMemory.length) {
    return { movies: fromMemory, cachedAt: cachedTimestamp }
  }

  let cacheData: MoviesCacheData | null = null
  try {
    cacheData = await getMoviesFromGist()
  } catch {
    // GIST not configured or read failed
  }

  if (cacheData?.data?.movies && cacheData.data.movies.length > 0) {
    setResultToCache(cacheData.data.movies)
    cachedTimestamp = cacheData.data.timestamp
    return { movies: cacheData.data.movies, cachedAt: cacheData.data.timestamp }
  }

  // No cache: bootstrap with one-shot fetch (same as cron refresh). Cron handles subsequent updates.
  try {
    const refreshed = await getMoviesListWithAutoUpdate()
    cachedTimestamp = Date.now()
    return { movies: refreshed, cachedAt: cachedTimestamp }
  } catch {
    return { movies: [], cachedAt: 0 }
  }
}

export interface GetMoviesListWithAutoUpdateOptions extends GetMergedMoviesListOptions {
  /** When true, skip cache freshness check and always fetch Maoyan + TMDB and write to GIST */
  forceRefresh?: boolean
}

/**
 * Get movies with auto-update: read cache; if stale/missing, fetch and save to GIST.
 * For use by cron or server; not from Edge (uses Node/async I/O).
 * @param options Merge options and optional forceRefresh
 * @returns Movies list
 */
export async function getMoviesListWithAutoUpdate(options: GetMoviesListWithAutoUpdateOptions = {}): Promise<MergedMovie[]> {
  const { forceRefresh, ...mergeOptions } = options
  if (!forceRefresh) {
    const cached = getResultFromCache()
    if (cached) return cached
  }
  let cacheData: MoviesCacheData | null = null
  try {
    cacheData = await getMoviesFromGist()
  } catch {
    // will create new
  }
  const needsUpdate = forceRefresh === true || !cacheData || (cacheData.data.timestamp && shouldUpdate(cacheData.data.timestamp))
  if (cacheData && !needsUpdate) {
    const count = cacheData.data.movies.length
    const ts = cacheData.data.timestamp
    logger.info('Using GIST cache (not stale)', {
      count,
      timestamp: ts,
      updatedAt: ts ? new Date(ts).toISOString() : undefined,
    })
    setResultToCache(cacheData.data.movies)
    return cacheData.data.movies
  }

  logger.info('Refreshing movies: fetching Maoyan (topRated + mostExpected)', { forceRefresh: forceRefresh === true })
  let newMovies: MergedMovie[]
  try {
    newMovies = await getMergedMoviesListWithoutCache(mergeOptions)
  } catch (err) {
    if (cacheData) {
      logger.warn('Refresh failed, using previous GIST cache', { count: cacheData.data.movies.length, error: err })
      return cacheData.data.movies
    }
    throw err
  }
  if (newMovies.length === 0) {
    if (cacheData) {
      logger.warn('Merge returned 0 movies, using previous cache', { count: cacheData.data.movies.length })
      return cacheData.data.movies
    }
    return []
  }

  logger.info('Merged list ready, saving to GIST', { count: newMovies.length })
  if (!cacheData) cacheData = createInitialCacheData(newMovies)
  else cacheData = updateCacheData(cacheData.data, newMovies, cacheData.notifiedMovieIds)
  try {
    await saveMoviesToGist(cacheData)
  } catch {
    // non-blocking
  }
  setResultToCache(cacheData.data.movies)
  return cacheData.data.movies
}

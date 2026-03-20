import { getJsonKv, setJsonKv } from '@/services/kv/client'
import { createLogger } from '@/services/logger'
import type { MergedMovie } from '@/services/maoyan/types'

import { DATA_VALIDITY_DURATION, MOVIES_CACHE_KV_KEY, RESULT_CACHE_KEY, UPDATE_WINDOW_DURATION, UPDATE_WINDOWS } from './constants'
import type { MoviesCacheData } from './types'

const logger = createLogger('movies-cache')

function getUtcDateString(date: Date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getUpdateWindowIndex(timestamp: number): number | null {
  const date = new Date(timestamp)
  const utcHour = date.getUTCHours()
  for (let i = 0; i < UPDATE_WINDOWS.length; i++) {
    const w = UPDATE_WINDOWS[i]
    if (utcHour >= w && utcHour < w + UPDATE_WINDOW_DURATION) return i
  }
  return null
}

/**
 * Whether the cached movies snapshot should be refreshed (stale or outside the current update window).
 * @param currentTimestamp Epoch milliseconds of the cached data
 * @returns True when the cache is stale and should be refreshed
 */
export function shouldUpdate(currentTimestamp: number): boolean {
  const now = Date.now()
  if (now - currentTimestamp >= DATA_VALIDITY_DURATION) return true
  const dataWindow = getUpdateWindowIndex(currentTimestamp)
  const currentWindow = getUpdateWindowIndex(now)
  if (dataWindow != null && currentWindow != null) return dataWindow !== currentWindow
  if (currentWindow != null && dataWindow === null) return true
  return false
}

/**
 * Read movies cache snapshot from KV.
 * @returns Cache data loaded from KV, or null when missing/invalid
 */
export async function getMoviesFromGist(): Promise<MoviesCacheData | null> {
  try {
    const data = await getJsonKv<MoviesCacheData>(MOVIES_CACHE_KV_KEY)
    if (!data?.data) {
      logger.warn('Invalid movies cache data structure')
      return null
    }
    logger.info('Movies cache loaded from KV')
    return data
  } catch (err) {
    throw err
  }
}

/**
 * Save movies cache snapshot to KV.
 * @param data Cache payload to save
 * @returns Promise resolved when the write completes
 */
export async function saveMoviesToGist(data: MoviesCacheData): Promise<void> {
  const content = JSON.stringify(data, null, 2)
  const size = new Blob([content]).size
  if (size > 1024 * 1024) {
    logger.warn(`Movies cache size ${(size / 1024).toFixed(2)}KB exceeds 1MB`)
    throw new Error('Movies cache content too large')
  }
  await setJsonKv(MOVIES_CACHE_KV_KEY, data)
  logger.info('Movies cache saved to KV')
}

/** In-memory result cache (per-instance) */
const resultCache = new Map<string, { data: MergedMovie[]; timestamp: number }>()

/**
 * Get memoized results from the in-memory cache.
 * @returns Cached movies, or null when missing/stale
 */
export function getResultFromCache(): MergedMovie[] | null {
  const entry = resultCache.get(RESULT_CACHE_KEY)
  if (!entry) return null
  if (Date.now() - entry.timestamp >= DATA_VALIDITY_DURATION) {
    resultCache.delete(RESULT_CACHE_KEY)
    return null
  }
  return entry.data
}

/**
 * Memoize movies results in the in-memory cache.
 * @param movies Movies list to memoize
 * @returns void
 */
export function setResultToCache(movies: MergedMovie[]): void {
  resultCache.set(RESULT_CACHE_KEY, { data: movies, timestamp: Date.now() })
}

/**
 * Find an existing movie in a list by maoyanId / tmdbId / name.
 * @param existing Existing movies list
 * @param newMovie Candidate movie to match
 * @returns The matched movie, or undefined when not found
 */
function findExistingMovie(existing: MergedMovie[], newMovie: MergedMovie): MergedMovie | undefined {
  for (const e of existing) {
    if (newMovie.maoyanId != null && e.maoyanId != null && String(newMovie.maoyanId) === String(e.maoyanId)) return e
    if (newMovie.tmdbId != null && e.tmdbId != null && newMovie.tmdbId === e.tmdbId) return e
    if (newMovie.name && e.name && newMovie.name.toLowerCase().trim() === e.name.toLowerCase().trim()) return e
  }
  return undefined
}

/**
 * Compute a stable cache id for a movie.
 * @param movie Movie object used to compute its id
 * @returns Stable id string
 */
export function getMovieId(movie: MergedMovie): string {
  if (movie.maoyanId != null) {
    const s = String(movie.maoyanId)
    if (!s.startsWith('tmdb-')) return `maoyan:${s}`
  }
  if (movie.tmdbId != null) return `tmdb:${movie.tmdbId}`
  if (movie.maoyanId != null) return `maoyan:${String(movie.maoyanId)}`
  return `name:${movie.name.toLowerCase().trim()}`
}

/**
 * Apply insertedAt/updatedAt timestamps to movies based on existing entries.
 * @param existing Previously cached movies
 * @param newMovies Newly fetched movies
 * @returns Movies list with insertedAt/updatedAt applied
 */
export function processMoviesWithInsertTime(existing: MergedMovie[], newMovies: MergedMovie[]): MergedMovie[] {
  const now = Date.now()
  return newMovies.map((movie) => {
    const ex = findExistingMovie(existing, movie)
    if (ex?.insertedAt) return { ...movie, insertedAt: ex.insertedAt, updatedAt: now }
    return { ...movie, insertedAt: now, updatedAt: now }
  })
}

/**
 * Sort movies by insertedAt ascending/descending logic (latest first).
 * @param movies Movies list
 * @returns Sorted movies list
 */
export function sortMoviesByInsertTime(movies: MergedMovie[]): MergedMovie[] {
  return [...movies].sort((a, b) => {
    if (!a.insertedAt && !b.insertedAt) return 0
    if (!a.insertedAt) return 1
    if (!b.insertedAt) return -1
    return b.insertedAt - a.insertedAt
  })
}

function hasMaoyanSource(movie: MergedMovie): boolean {
  return movie.sources?.some((s) => s === 'topRated' || s === 'mostExpected') ?? false
}

/**
 * Sort movies: Maoyan (topRated/mostExpected) first, then by insertedAt descending.
 * @param movies Movies list
 * @returns Sorted movies list
 */
export function sortMoviesMaoyanFirstThenByInsertTime(movies: MergedMovie[]): MergedMovie[] {
  return [...movies].sort((a, b) => {
    const aMaoyan = hasMaoyanSource(a)
    const bMaoyan = hasMaoyanSource(b)
    if (aMaoyan !== bMaoyan) return aMaoyan ? -1 : 1
    if (!a.insertedAt && !b.insertedAt) return 0
    if (!a.insertedAt) return 1
    if (!b.insertedAt) return -1
    return b.insertedAt - a.insertedAt
  })
}

/**
 * Create the initial KV payload for a freshly built movies cache.
 * @param movies Movies list
 * @returns Initial cache payload with metadata and empty notified list
 */
export function createInitialCacheData(movies: MergedMovie[]): MoviesCacheData {
  const now = Date.now()
  const processed = processMoviesWithInsertTime([], movies)
  const sorted = sortMoviesMaoyanFirstThenByInsertTime(processed)
  return {
    data: {
      date: getUtcDateString(),
      timestamp: now,
      movies: sorted,
      metadata: { totalCount: sorted.length, description: `Movies cache created at ${new Date(now).toISOString()}` },
    },
    notifiedMovieIds: [],
  }
}

/**
 * Update an existing KV cache payload with a new movies list.
 * @param existing Previous cache data (data section)
 * @param newMovies New movies list
 * @param previousNotified Movie ids that were previously notified
 * @returns Updated cache payload
 */
export function updateCacheData(existing: MoviesCacheData['data'], newMovies: MergedMovie[], previousNotified: string[] = []): MoviesCacheData {
  const now = Date.now()
  const processed = processMoviesWithInsertTime(existing.movies, newMovies)
  const sorted = sortMoviesMaoyanFirstThenByInsertTime(processed)
  const newIds = new Set(sorted.map((m) => getMovieId(m)))
  const cleanedNotified = previousNotified.filter((id) => newIds.has(id))
  return {
    data: {
      date: getUtcDateString(),
      timestamp: now,
      movies: sorted,
      metadata: {
        totalCount: sorted.length,
        description: `Movies cache updated at ${new Date(now).toISOString()}`,
      },
    },
    notifiedMovieIds: cleanedNotified,
  }
}

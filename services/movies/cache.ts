import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'
import { info, warn } from '@/services/logger'
import type { MergedMovie } from '@/services/maoyan/types'

import { DATA_VALIDITY_DURATION, GIST_FILE_NAME, RESULT_CACHE_KEY, UPDATE_WINDOW_DURATION, UPDATE_WINDOWS } from './constants'
import type { MoviesCacheData } from './types'

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
 * Whether cache should be updated (stale or in new window)
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
 * Read movies cache from GIST
 * @returns Cache data or null if file not found
 */
export async function getMoviesFromGist(): Promise<MoviesCacheData | null> {
  const { gistId, gistToken } = getGistInfo()
  try {
    const content = await readGistFile({ gistId, gistToken, fileName: GIST_FILE_NAME })
    const data = JSON.parse(content) as MoviesCacheData
    if (!data.data) {
      warn('Invalid movies cache data structure')
      return null
    }
    info('Movies cache loaded from GIST')
    return data
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      info('Movies cache file not found in GIST')
      return null
    }
    throw err
  }
}

/**
 * Save movies cache to GIST
 */
export async function saveMoviesToGist(data: MoviesCacheData): Promise<void> {
  const { gistId, gistToken } = getGistInfo()
  const content = JSON.stringify(data, null, 2)
  const size = new Blob([content]).size
  if (size > 1024 * 1024) {
    warn(`Movies cache size ${(size / 1024).toFixed(2)}KB exceeds 1MB`)
    throw new Error('Movies cache content too large')
  }
  await writeGistFile({ gistId, gistToken, fileName: GIST_FILE_NAME, content })
  info('Movies cache saved to GIST')
}

/** In-memory result cache (per-instance) */
const resultCache = new Map<string, { data: MergedMovie[]; timestamp: number }>()

export function getResultFromCache(): MergedMovie[] | null {
  const entry = resultCache.get(RESULT_CACHE_KEY)
  if (!entry) return null
  if (Date.now() - entry.timestamp >= DATA_VALIDITY_DURATION) {
    resultCache.delete(RESULT_CACHE_KEY)
    return null
  }
  return entry.data
}

export function setResultToCache(movies: MergedMovie[]): void {
  resultCache.set(RESULT_CACHE_KEY, { data: movies, timestamp: Date.now() })
}

/** Find existing movie by maoyanId / tmdbId / name */
function findExistingMovie(existing: MergedMovie[], newMovie: MergedMovie): MergedMovie | undefined {
  for (const e of existing) {
    if (newMovie.maoyanId != null && e.maoyanId != null && String(newMovie.maoyanId) === String(e.maoyanId)) return e
    if (newMovie.tmdbId != null && e.tmdbId != null && newMovie.tmdbId === e.tmdbId) return e
    if (newMovie.name && e.name && newMovie.name.toLowerCase().trim() === e.name.toLowerCase().trim()) return e
  }
  return undefined
}

export function getMovieId(movie: MergedMovie): string {
  if (movie.maoyanId != null) {
    const s = String(movie.maoyanId)
    if (!s.startsWith('tmdb-')) return `maoyan:${s}`
  }
  if (movie.tmdbId != null) return `tmdb:${movie.tmdbId}`
  if (movie.maoyanId != null) return `maoyan:${String(movie.maoyanId)}`
  return `name:${movie.name.toLowerCase().trim()}`
}

export function processMoviesWithInsertTime(existing: MergedMovie[], newMovies: MergedMovie[]): MergedMovie[] {
  const now = Date.now()
  return newMovies.map((movie) => {
    const ex = findExistingMovie(existing, movie)
    if (ex?.insertedAt) return { ...movie, insertedAt: ex.insertedAt, updatedAt: now }
    return { ...movie, insertedAt: now, updatedAt: now }
  })
}

export function sortMoviesByInsertTime(movies: MergedMovie[]): MergedMovie[] {
  return [...movies].sort((a, b) => {
    if (!a.insertedAt && !b.insertedAt) return 0
    if (!a.insertedAt) return 1
    if (!b.insertedAt) return -1
    return b.insertedAt - a.insertedAt
  })
}

export function createInitialCacheData(movies: MergedMovie[]): MoviesCacheData {
  const now = Date.now()
  const processed = processMoviesWithInsertTime([], movies)
  const sorted = sortMoviesByInsertTime(processed)
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

export function updateCacheData(existing: MoviesCacheData['data'], newMovies: MergedMovie[], previousNotified: string[] = []): MoviesCacheData {
  const now = Date.now()
  const processed = processMoviesWithInsertTime(existing.movies, newMovies)
  const sorted = sortMoviesByInsertTime(processed)
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

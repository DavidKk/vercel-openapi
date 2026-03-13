import type { MergedMovie } from '@/services/maoyan/types'

import { judgeMovieHotStatusWithMaoyan } from './maoyan'
import { judgeMovieHotStatusWithTMDB } from './tmdb'
import { MovieHotStatus } from './types'

export { MovieHotStatus } from './types'

function parseReleaseDate(releaseDateString: string | undefined): Date | null {
  if (!releaseDateString) return null
  try {
    const date = new Date(releaseDateString)
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

function isDateAfter(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  return d1 > d2
}

/**
 * Judge movie hot status (TMDB preferred, fallback Maoyan).
 *
 * @param movie Merged movie with release date and popularity/rating data
 * @returns Movie hot status level
 */
export function judgeMovieHotStatus(movie: MergedMovie): MovieHotStatus {
  const today = new Date()
  const releaseDate = parseReleaseDate(movie.releaseDate)
  const hasTmdbData = movie.tmdbId !== undefined && (movie.popularity !== undefined || movie.rating !== undefined || movie.tmdbVoteCount !== undefined)

  if (hasTmdbData) {
    return judgeMovieHotStatusWithTMDB(movie, today, releaseDate, isDateAfter)
  }
  return judgeMovieHotStatusWithMaoyan(movie, today, releaseDate, isDateAfter)
}

/**
 * @param movie Movie data
 * @returns true if movie is highly anticipated
 */
export function isHighlyAnticipated(movie: MergedMovie): boolean {
  return judgeMovieHotStatus(movie) === MovieHotStatus.HIGHLY_ANTICIPATED
}

/**
 * @param movie Movie data
 * @returns true if movie is very hot
 */
export function isVeryHot(movie: MergedMovie): boolean {
  return judgeMovieHotStatus(movie) === MovieHotStatus.VERY_HOT
}

/**
 * Hot = highly anticipated or very hot.
 *
 * @param movie Movie data
 * @returns true if movie is hot (popular)
 */
export function isHot(movie: MergedMovie): boolean {
  const status = judgeMovieHotStatus(movie)
  return status === MovieHotStatus.HIGHLY_ANTICIPATED || status === MovieHotStatus.VERY_HOT
}

/**
 * Filter to only hot movies (for “recently released hot” list).
 *
 * @param movies Full movie list
 * @returns Only hot movies
 */
export function filterHotMovies(movies: MergedMovie[]): MergedMovie[] {
  return movies.filter(isHot)
}

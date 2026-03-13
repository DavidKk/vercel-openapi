/**
 * TMDB API service constants
 */

export const TMDB = {
  /** TMDB API base URL */
  API_BASE_URL: 'https://api.themoviedb.org/3',
} as const

/**
 * Cache duration for TMDB API requests (milliseconds)
 */
export const TMDB_CACHE = {
  SEARCH: 10 * 60 * 1000,
  MOVIE_DETAILS: 30 * 60 * 1000,
} as const

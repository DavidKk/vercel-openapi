import { decodeBase64Url } from '@/utils/url-base64'

/**
 * TMDB API service constants
 */
export const TMDB = {
  /** TMDB API base URL */
  API_BASE_URL: decodeBase64Url('aHR0cHM6Ly9hcGkudGhlbW92aWVkYi5vcmcvMw=='),
  /** Poster image base (append poster_path). */
  POSTER_BASE: decodeBase64Url('aHR0cHM6Ly9pbWFnZS50bWRiLm9yZy90L3AvdzUwMA=='),
  /** Movie page base (append movie id). */
  MOVIE_PAGE_BASE: decodeBase64Url('aHR0cHM6Ly93d3cudGhlbW92aWVkYi5vcmcvbW92aWUv'),
} as const

/**
 * Cache duration for TMDB API requests (milliseconds)
 */
export const TMDB_CACHE = {
  SEARCH: 10 * 60 * 1000,
  MOVIE_DETAILS: 30 * 60 * 1000,
} as const

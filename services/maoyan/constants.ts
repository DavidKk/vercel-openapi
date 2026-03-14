/**
 * Maoyan API service constants
 */

export const MAOYAN = {
  /** Maoyan API base URL (apis.netstart.cn) */
  API_BASE: 'https://apis.netstart.cn/maoyan',
  /** Maoyan m-site detail API (returns detailMovie.dra = plot) */
  DETAIL_URL: 'https://m.maoyan.com/ajax/detailmovie',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
} as const

export const MAOYAN_CACHE = {
  TOP_RATED_MOVIES: 5 * 60 * 1000,
  MOST_EXPECTED: 5 * 60 * 1000,
} as const

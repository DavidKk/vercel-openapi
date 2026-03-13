/**
 * Maoyan API service constants
 */

export const MAOYAN = {
  /** Maoyan API base URL (apis.netstart.cn) */
  API_BASE: 'https://apis.netstart.cn/maoyan',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
} as const

export const MAOYAN_CACHE = {
  TOP_RATED_MOVIES: 5 * 60 * 1000,
  MOST_EXPECTED: 5 * 60 * 1000,
} as const

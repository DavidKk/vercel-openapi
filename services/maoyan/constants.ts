import { decodeBase64Url } from '@/utils/url-base64'

/**
 * Maoyan API service constants
 */
export const MAOYAN = {
  /** Maoyan API base URL (apis.netstart.cn) */
  API_BASE: decodeBase64Url('aHR0cHM6Ly9hcGlzLm5ldHN0YXJ0LmNuL21hb3lhbg=='),
  /** Maoyan m-site detail API (returns detailMovie.dra = plot) */
  DETAIL_URL: decodeBase64Url('aHR0cHM6Ly9tLm1hb3lhbi5jb20vYWpheC9kZXRhaWxtb3ZpZQ=='),
  /** Maoyan film page base (append film id). */
  FILM_PAGE_BASE: decodeBase64Url('aHR0cHM6Ly9tYW95YW4uY29tL2ZpbG1zLw=='),
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
} as const

export const MAOYAN_CACHE = {
  TOP_RATED_MOVIES: 5 * 60 * 1000,
  MOST_EXPECTED: 5 * 60 * 1000,
} as const

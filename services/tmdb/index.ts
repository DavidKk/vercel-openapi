import { fetchJsonWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'
import { getTmdbApiKey, hasTmdbApiKey } from '@/services/tmdb/env'

import { TMDB, TMDB_CACHE } from './constants'
import type { SearchResult } from './types'

export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBGenresResponse {
  genres: TMDBGenre[]
}

/**
 * Fetch movie genres from TMDB (with cache)
 * @returns Map of genre id to name
 */
export async function fetchMovieGenres(): Promise<Map<number, string>> {
  const apiKey = getTmdbApiKey()
  const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const apiUrl = `${TMDB.API_BASE_URL}/genre/movie/list?api_key=${apiKey}&language=${language}`
  const data = await fetchJsonWithCache<TMDBGenresResponse>(apiUrl, {
    headers: { accept: 'application/json' },
    cacheDuration: 60 * 1000,
  })
  return new Map(data.genres.map((g) => [g.id, g.name]))
}

/**
 * Convert genre IDs to names
 * @param genreIds Genre IDs
 * @returns Genre names
 */
export async function getGenreNames(genreIds: number[]): Promise<string[]> {
  if (!genreIds?.length) return []
  const map = await fetchMovieGenres()
  return genreIds.map((id) => map.get(id) || '').filter(Boolean)
}

export interface SearchResponse {
  page: number
  results: SearchResult[]
  total_pages: number
  total_results: number
}

export interface SearchOptions {
  language?: string
  region?: string
}

export interface TMDBMovie {
  id: number
  title: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  vote_average?: number
  vote_count?: number
  popularity?: number
  adult?: boolean
  original_language?: string
  original_title?: string
  genre_ids?: number[]
}

export interface TMDBMoviesResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

export interface FetchMoviesOptions extends SearchOptions {
  page?: number
  region?: string
  primary_release_date_gte?: string
  primary_release_date_lte?: string
}

/**
 * Fetch popular movies (2 weeks ago to today, rating >= 7.0)
 */
export async function fetchPopularMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1
  const today = new Date()
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const dateGte = twoWeeksAgo.toISOString().split('T')[0]
  const dateLte = today.toISOString().split('T')[0]
  const params = new URLSearchParams({
    api_key: apiKey,
    language,
    page: String(page),
    sort_by: 'popularity.desc',
    'primary_release_date.gte': dateGte,
    'primary_release_date.lte': dateLte,
    'vote_average.gte': '7.0',
  })
  if (options.region) params.set('region', options.region)
  const apiUrl = `${TMDB.API_BASE_URL}/discover/movie?${params.toString()}`
  const data = await fetchJsonWithCache<TMDBMoviesResponse>(apiUrl, {
    headers: { accept: 'application/json' },
    cacheDuration: 60 * 1000,
  })
  if (!data?.results) throw new Error('TMDB fetch popular movies: invalid response')
  info(`Fetched ${data.results.length} popular movies from TMDB`)
  return data.results
}

/**
 * Fetch upcoming movies (today to 1 month)
 */
export async function fetchUpcomingMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1
  const today = new Date()
  const oneMonthLater = new Date()
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
  const dateGte = today.toISOString().split('T')[0]
  const dateLte = oneMonthLater.toISOString().split('T')[0]
  const params = new URLSearchParams({
    api_key: apiKey,
    language,
    page: String(page),
    sort_by: 'popularity.desc',
    'primary_release_date.gte': dateGte,
    'primary_release_date.lte': dateLte,
  })
  if (options.region) params.set('region', options.region)
  const apiUrl = `${TMDB.API_BASE_URL}/discover/movie?${params.toString()}`
  const data = await fetchJsonWithCache<TMDBMoviesResponse>(apiUrl, {
    headers: { accept: 'application/json' },
    cacheDuration: 60 * 1000,
  })
  if (!data?.results) throw new Error('TMDB fetch upcoming movies: invalid response')
  info(`Fetched ${data.results.length} upcoming movies from TMDB`)
  return data.results
}

/**
 * Get movie details (cached). Tries preferred language then English for overview.
 * @param movieId TMDB movie ID
 * @param preferredLanguage Language code
 * @returns Movie details or null
 */
export async function getMovieDetails(movieId: number, preferredLanguage = 'zh-CN'): Promise<{ overview?: string; [key: string]: unknown } | null> {
  const apiKey = getTmdbApiKey()
  try {
    const apiUrl = `${TMDB.API_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=${preferredLanguage}`
    let data = await fetchJsonWithCache<{ overview?: string }>(apiUrl, {
      headers: { accept: 'application/json' },
      cacheDuration: TMDB_CACHE.MOVIE_DETAILS,
    })
    if (!data) return null
    if ((!data.overview || !data.overview.trim()) && preferredLanguage !== 'en-US' && preferredLanguage !== 'en') {
      const enUrl = `${TMDB.API_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=en-US`
      const enData = await fetchJsonWithCache<{ overview?: string }>(enUrl, {
        headers: { accept: 'application/json' },
        cacheDuration: TMDB_CACHE.MOVIE_DETAILS,
      })
      if (enData?.overview?.trim()) data = { ...data, overview: enData.overview }
    }
    return data
  } catch (err) {
    fail(`TMDB get movie details error for movie ${movieId}:`, err)
    return null
  }
}

/**
 * Search multi (movie/tv) by title
 * @param title Query string
 * @param options Language/region
 * @returns Search results or empty array
 */
export async function searchMulti(title: string, options: SearchOptions = {}): Promise<SearchResult[] | null> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const region = options.region ?? process.env.TMDB_REGION
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      query: title,
      include_adult: 'false',
      language,
    })
    if (region) params.set('region', region)
    const apiUrl = `${TMDB.API_BASE_URL}/search/multi?${params.toString()}`
    const data = await fetchJsonWithCache<SearchResponse>(apiUrl, {
      headers: { accept: 'application/json' },
      cacheDuration: TMDB_CACHE.SEARCH,
    })
    if (!data?.results?.length) {
      warn(`TMDB search empty result for "${title}"`)
      return []
    }
    return data.results
  } catch (err) {
    fail(`TMDB search error for "${title}":`, err)
    return null
  }
}

export { hasTmdbApiKey }

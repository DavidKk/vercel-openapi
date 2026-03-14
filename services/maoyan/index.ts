import { fetchJsonWithCache } from '@/services/fetch'
import type { TMDBMovie } from '@/services/tmdb'
import { fetchPopularMovies, fetchUpcomingMovies, getGenreNames, hasTmdbApiKey } from '@/services/tmdb'

import { MAOYAN } from './constants'
import { logger } from './logger'
import type { ComingMovie, MergedMovie, MostExpectedResponse, MovieListItem, TopRatedMoviesResponse } from './types'

async function fetchTopRatedMoviesWithoutCache(): Promise<MovieListItem[]> {
  logger.info('Fetching top rated movies from Maoyan (no cache)')
  const data = await fetchJsonWithCache<TopRatedMoviesResponse>(`${MAOYAN.API_BASE}/index/topRatedMovies`, {
    headers: { 'User-Agent': MAOYAN.USER_AGENT },
    cacheDuration: 0,
  })
  return data.movieList || []
}

async function fetchMostExpectedWithoutCache(limit = 20, offset = 0): Promise<ComingMovie[]> {
  const data = await fetchJsonWithCache<MostExpectedResponse>(`${MAOYAN.API_BASE}/index/mostExpected?ci=1&limit=${limit}&offset=${offset}`, {
    headers: { 'User-Agent': MAOYAN.USER_AGENT },
    cacheDuration: 0,
  })
  return data.coming || []
}

/** Maoyan detail API response (detailmovie?movieId=xxx) */
interface MaoyanDetailResponse {
  detailMovie?: { dra?: string }
}

/**
 * Fetch movie detail from Maoyan m-site; returns plot (dra) for overview.
 * @param movieId Maoyan movie ID (numeric)
 * @returns dra string or null
 */
async function fetchMaoyanDetail(movieId: number): Promise<string | null> {
  try {
    const data = await fetchJsonWithCache<MaoyanDetailResponse>(`${MAOYAN.DETAIL_URL}?movieId=${movieId}`, {
      headers: { 'User-Agent': MAOYAN.USER_AGENT },
      cacheDuration: 5 * 60 * 1000,
    })
    const dra = data.detailMovie?.dra?.trim()
    return dra || null
  } catch (err) {
    logger.warn('Maoyan detail fetch failed', { movieId, error: err })
    return null
  }
}

/**
 * For each movie with numeric maoyanId and no overview, fetch Maoyan detail and set overview from dra.
 * Serial requests; one failure does not stop the rest.
 */
async function batchEnrichOverviewFromMaoyanDetail(movieMap: Map<string, MergedMovie>): Promise<void> {
  const toEnrich = Array.from(movieMap.values()).filter((m) => typeof m.maoyanId === 'number' && !m.overview?.trim())
  if (toEnrich.length === 0) return
  let filled = 0
  for (const movie of toEnrich) {
    const dra = await fetchMaoyanDetail(movie.maoyanId as number)
    if (dra) {
      movie.overview = dra
      filled++
    }
  }
  logger.info('Maoyan detail overview filled', { filled, total: toEnrich.length })
}

function getMaoyanUrl(maoyanId: number | string): string | undefined {
  if (typeof maoyanId === 'number') return `https://maoyan.com/films/${maoyanId}`
  return undefined
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[，。！？、；：""''（）【】《》\s]+/g, ' ')
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findMatchingMovie(movieMap: Map<string, MergedMovie>, title: string): MergedMovie | undefined {
  const norm = normalizeTitle(title)
  for (const [key, movie] of movieMap.entries()) {
    if (normalizeTitle(key) === norm) return movie
  }
  for (const [key, movie] of movieMap.entries()) {
    const nk = normalizeTitle(key)
    if (norm.includes(nk) || nk.includes(norm)) return movie
  }
  return undefined
}

async function convertTMDBMovieToMergedMovie(tmdbMovie: TMDBMovie, source: 'tmdbPopular' | 'tmdbUpcoming'): Promise<MergedMovie> {
  const movie: MergedMovie = {
    maoyanId: `tmdb-${tmdbMovie.id}`,
    name: tmdbMovie.title,
    poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : '',
    source,
    sources: [source],
    tmdbId: tmdbMovie.id,
    tmdbUrl: `https://www.themoviedb.org/movie/${tmdbMovie.id}`,
  }
  if (tmdbMovie.poster_path) movie.tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
  if (tmdbMovie.release_date) {
    movie.releaseDate = tmdbMovie.release_date
    const y = tmdbMovie.release_date.match(/^(\d{4})/)
    if (y) movie.year = parseInt(y[1], 10)
  }
  if (tmdbMovie.vote_average) movie.rating = tmdbMovie.vote_average
  if (tmdbMovie.vote_count) movie.tmdbVoteCount = tmdbMovie.vote_count
  if (tmdbMovie.popularity) movie.popularity = tmdbMovie.popularity
  if (tmdbMovie.genre_ids?.length) movie.genres = await getGenreNames(tmdbMovie.genre_ids)
  return movie
}

async function mergeTMDBMovies(movieMap: Map<string, MergedMovie>, tmdbMovies: TMDBMovie[], source: 'tmdbPopular' | 'tmdbUpcoming'): Promise<void> {
  for (const tmdbMovie of tmdbMovies) {
    const existing = findMatchingMovie(movieMap, tmdbMovie.title)
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source)
      if (!existing.tmdbId && tmdbMovie.id) {
        existing.tmdbId = tmdbMovie.id
        existing.tmdbUrl = `https://www.themoviedb.org/movie/${tmdbMovie.id}`
        if (tmdbMovie.poster_path) existing.tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        if (tmdbMovie.release_date) {
          existing.releaseDate = tmdbMovie.release_date
          const y = tmdbMovie.release_date.match(/^(\d{4})/)
          if (y) existing.year = parseInt(y[1], 10)
        }
        if (tmdbMovie.vote_average != null) existing.rating = tmdbMovie.vote_average
        if (tmdbMovie.vote_count != null) existing.tmdbVoteCount = tmdbMovie.vote_count
        if (tmdbMovie.popularity != null) existing.popularity = tmdbMovie.popularity
        if (tmdbMovie.genre_ids?.length) existing.genres = await getGenreNames(tmdbMovie.genre_ids)
      }
    } else {
      const newMovie = await convertTMDBMovieToMergedMovie(tmdbMovie, source)
      movieMap.set(tmdbMovie.title.toLowerCase().trim(), newMovie)
    }
  }
}

export interface GetMergedMoviesListOptions {
  includeTMDBPopular?: boolean
  includeTMDBUpcoming?: boolean
}

/**
 * Get merged movie list without request-level cache (for GIST cache refresh).
 * Data: Maoyan (topRated + mostExpected) + Maoyan detail for overview + TMDB popular/upcoming by title merge only (no per-movie TMDB search).
 * @param options includeTMDBPopular, includeTMDBUpcoming (default true when TMDB_API_KEY set)
 * @returns Merged list of movies
 */
export async function getMergedMoviesListWithoutCache(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  const { includeTMDBPopular = true, includeTMDBUpcoming = true } = options
  logger.info('Fetching movie list from Maoyan (no request cache)')
  const [topRatedRes, mostExpectedRes] = await Promise.allSettled([fetchTopRatedMoviesWithoutCache(), fetchMostExpectedWithoutCache(20, 0)])
  const topRated = topRatedRes.status === 'fulfilled' ? topRatedRes.value : []
  const mostExpected = mostExpectedRes.status === 'fulfilled' ? mostExpectedRes.value : []
  if (topRatedRes.status === 'rejected') logger.fail('Failed to fetch top rated from Maoyan:', topRatedRes.reason)
  if (mostExpectedRes.status === 'rejected') logger.fail('Failed to fetch most expected from Maoyan:', mostExpectedRes.reason)
  logger.info(`Maoyan fetch result: topRated=${topRated.length}, mostExpected=${mostExpected.length}`)
  if (topRated.length === 0 && mostExpected.length === 0) {
    logger.warn('No Maoyan data. Check network to apis.netstart.cn.')
  }
  const movieMap = new Map<string, MergedMovie>()
  for (const movie of topRated) {
    const key = movie.name.toLowerCase().trim()
    movieMap.set(key, {
      maoyanId: movie.movieId,
      name: movie.name,
      poster: movie.poster,
      score: movie.score,
      source: 'topRated',
      sources: ['topRated'],
      maoyanUrl: getMaoyanUrl(movie.movieId),
    })
  }
  for (const movie of mostExpected) {
    const key = movie.nm.toLowerCase().trim()
    const existing = movieMap.get(key)
    if (existing) {
      if (!existing.sources.includes('mostExpected')) existing.sources.push('mostExpected')
      if (movie.wish != null && existing.wish == null) existing.wish = movie.wish
      if (!existing.maoyanUrl) existing.maoyanUrl = getMaoyanUrl(movie.id)
    } else {
      movieMap.set(key, {
        maoyanId: movie.id,
        name: movie.nm,
        poster: movie.img,
        wish: movie.wish,
        source: 'mostExpected',
        sources: ['mostExpected'],
        maoyanUrl: getMaoyanUrl(movie.id),
      })
    }
  }
  logger.info(`Merged ${movieMap.size} unique movies from Maoyan`)

  await batchEnrichOverviewFromMaoyanDetail(movieMap)

  if (hasTmdbApiKey() && (includeTMDBPopular || includeTMDBUpcoming)) {
    const promises: Promise<TMDBMovie[]>[] = []
    if (includeTMDBPopular) promises.push(fetchPopularMovies({ language: 'zh-CN', page: 1 }))
    if (includeTMDBUpcoming) promises.push(fetchUpcomingMovies({ language: 'zh-CN', page: 1 }))
    const results = await Promise.allSettled(promises)
    let idx = 0
    if (includeTMDBPopular) {
      const r0 = results[idx]
      if (r0?.status === 'fulfilled') {
        await mergeTMDBMovies(movieMap, r0.value, 'tmdbPopular')
        logger.info('TMDB popular merged', { count: r0.value.length })
      } else {
        logger.warn('TMDB popular fetch failed, skipping', { reason: r0?.status === 'rejected' ? r0.reason : 'unknown' })
      }
      idx++
    }
    if (includeTMDBUpcoming) {
      const r1 = results[idx]
      if (r1?.status === 'fulfilled') {
        await mergeTMDBMovies(movieMap, r1.value, 'tmdbUpcoming')
        logger.info('TMDB upcoming merged', { count: r1.value.length })
      } else {
        logger.warn('TMDB upcoming fetch failed, skipping', { reason: r1?.status === 'rejected' ? r1.reason : 'unknown' })
      }
    }
  }

  const list = Array.from(movieMap.values())
  logger.info(`Final merged list: ${list.length} unique movies`)
  return list
}

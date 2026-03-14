import { fetchJsonWithCache } from '@/services/fetch'
import type { TMDBMovie } from '@/services/tmdb'
import { fetchPopularMovies, fetchUpcomingMovies, getGenreNames, getMovieDetails, hasTmdbApiKey, searchMulti } from '@/services/tmdb'

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

async function enrichMovieWithSearchResult(movie: MergedMovie): Promise<{
  movie: MergedMovie
  needsDetails: boolean
  genreIds: number[]
}> {
  if (!hasTmdbApiKey()) return { movie, needsDetails: false, genreIds: [] }
  try {
    const results = await searchMulti(movie.name, { language: 'zh-CN' })
    if (!results?.length) return { movie, needsDetails: false, genreIds: [] }
    const movieResult = results.find((r) => r.media_type === 'movie') ?? results[0]
    if (movieResult.id && movieResult.media_type === 'movie') {
      movie.tmdbId = movieResult.id
      movie.tmdbUrl = `https://www.themoviedb.org/movie/${movieResult.id}`
      if (movieResult.poster_path) movie.tmdbPoster = `https://image.tmdb.org/t/p/w500${movieResult.poster_path}`
      const needsDetails = !movieResult.overview || !movieResult.overview.trim()
      if (!needsDetails) movie.overview = movieResult.overview
      if ('release_date' in movieResult && movieResult.release_date) {
        movie.releaseDate = movieResult.release_date
        const y = movieResult.release_date.match(/^(\d{4})/)
        if (y) movie.year = parseInt(y[1], 10)
      }
      if ('vote_average' in movieResult && movieResult.vote_average) movie.rating = movieResult.vote_average
      if ('vote_count' in movieResult && movieResult.vote_count) movie.tmdbVoteCount = movieResult.vote_count
      if ('popularity' in movieResult && movieResult.popularity) movie.popularity = movieResult.popularity
      const genreIds = movieResult.genre_ids || []
      return { movie, needsDetails, genreIds }
    }
  } catch (err) {
    logger.fail(`Error searching TMDB for "${movie.name}":`, err)
  }
  return { movie, needsDetails: false, genreIds: [] }
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

async function batchEnrichMoviesWithTMDB(movies: MergedMovie[], tmdbTitleMap?: Map<string, TMDBMovie>): Promise<MergedMovie[]> {
  if (!hasTmdbApiKey() || !movies.length) return movies
  const moviesToSearch: Array<{ movie: MergedMovie; index: number }> = []
  const enriched: MergedMovie[] = []
  if (tmdbTitleMap) {
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i]
      const exactKey = movie.name.toLowerCase().trim()
      let tmdbMovie = tmdbTitleMap.get(exactKey)
      if (!tmdbMovie) {
        const norm = normalizeTitle(movie.name)
        for (const [title, tmdb] of tmdbTitleMap.entries()) {
          if (normalizeTitle(title) === norm) {
            tmdbMovie = tmdb
            break
          }
        }
      }
      if (tmdbMovie) {
        enriched[i] = {
          ...movie,
          tmdbId: tmdbMovie.id,
          tmdbUrl: `https://www.themoviedb.org/movie/${tmdbMovie.id}`,
          tmdbPoster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : undefined,
          overview: tmdbMovie.overview?.trim() || movie.overview,
          releaseDate: tmdbMovie.release_date || movie.releaseDate,
          year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.slice(0, 4), 10) : movie.year,
          rating: tmdbMovie.vote_average ?? movie.rating,
          tmdbVoteCount: tmdbMovie.vote_count ?? movie.tmdbVoteCount,
          popularity: tmdbMovie.popularity ?? movie.popularity,
        }
        if (tmdbMovie.genre_ids?.length) {
          enriched[i].genres = await getGenreNames(tmdbMovie.genre_ids)
        }
      } else {
        moviesToSearch.push({ movie, index: i })
        enriched[i] = movie
      }
    }
  } else {
    for (let i = 0; i < movies.length; i++) {
      moviesToSearch.push({ movie: movies[i], index: i })
      enriched[i] = movies[i]
    }
  }
  const results = await Promise.allSettled(moviesToSearch.map(({ movie }) => enrichMovieWithSearchResult(movie)))
  const needDetails: Array<{ movie: MergedMovie; idx: number }> = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const item = moviesToSearch[i]
    if (r.status === 'fulfilled') {
      enriched[item.index] = r.value.movie
      if (r.value.needsDetails && r.value.movie.tmdbId) needDetails.push({ movie: r.value.movie, idx: item.index })
    }
  }
  if (needDetails.length) {
    const details = await Promise.allSettled(needDetails.map(({ movie }) => getMovieDetails(movie.tmdbId!, 'zh-CN')))
    for (let i = 0; i < details.length; i++) {
      const d = details[i]
      if (d.status === 'fulfilled' && d.value?.overview) enriched[needDetails[i].idx].overview = d.value.overview
    }
  }
  return enriched
}

function getMaoyanUrl(maoyanId: number | string): string | undefined {
  if (typeof maoyanId === 'number') return `https://maoyan.com/films/${maoyanId}`
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
  if (tmdbMovie.overview?.trim()) movie.overview = tmdbMovie.overview
  else {
    const details = await getMovieDetails(tmdbMovie.id, 'zh-CN')
    if (details?.overview?.trim()) movie.overview = details.overview
  }
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

async function mergeTMDBMovies(movieMap: Map<string, MergedMovie>, tmdbMovies: TMDBMovie[], source: 'tmdbPopular' | 'tmdbUpcoming', isFromNowPlaying = false): Promise<void> {
  const toMerge = isFromNowPlaying ? tmdbMovies.filter((m) => (m.vote_average || 0) >= 7.0) : tmdbMovies
  const effectiveSource = isFromNowPlaying ? 'tmdbUpcoming' : source
  for (const tmdbMovie of toMerge) {
    const existing = findMatchingMovie(movieMap, tmdbMovie.title)
    if (existing) {
      if (!existing.sources.includes(effectiveSource)) existing.sources.push(effectiveSource)
      if (!existing.tmdbId && tmdbMovie.id) {
        existing.tmdbId = tmdbMovie.id
        existing.tmdbUrl = `https://www.themoviedb.org/movie/${tmdbMovie.id}`
        if (tmdbMovie.poster_path) existing.tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        if (tmdbMovie.overview?.trim()) existing.overview = tmdbMovie.overview
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
      const newMovie = await convertTMDBMovieToMergedMovie(tmdbMovie, effectiveSource)
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
 * @param options Include TMDB popular/upcoming
 * @returns Merged list of movies
 */
export async function getMergedMoviesListWithoutCache(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  logger.info('Fetching and merging movie lists from Maoyan and TMDB (no request cache)')
  const { includeTMDBPopular = true, includeTMDBUpcoming = true } = options
  const [topRatedRes, mostExpectedRes] = await Promise.allSettled([fetchTopRatedMoviesWithoutCache(), fetchMostExpectedWithoutCache(20, 0)])
  const topRated = topRatedRes.status === 'fulfilled' ? topRatedRes.value : []
  const mostExpected = mostExpectedRes.status === 'fulfilled' ? mostExpectedRes.value : []
  if (topRatedRes.status === 'rejected') logger.fail('Failed to fetch top rated from Maoyan:', topRatedRes.reason)
  if (mostExpectedRes.status === 'rejected') logger.fail('Failed to fetch most expected from Maoyan:', mostExpectedRes.reason)
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
  if (hasTmdbApiKey()) {
    const tmdbTitleMap = new Map<string, TMDBMovie>()
    const promises: Promise<TMDBMovie[]>[] = []
    if (includeTMDBPopular) promises.push(fetchPopularMovies({ language: 'zh-CN', page: 1 }))
    if (includeTMDBUpcoming) promises.push(fetchUpcomingMovies({ language: 'zh-CN', page: 1 }))
    if (promises.length) {
      const results = await Promise.allSettled(promises)
      let idx = 0
      const r0 = results[idx]
      if (includeTMDBPopular && r0?.status === 'fulfilled') {
        const list = r0.value
        for (const m of list) tmdbTitleMap.set(m.title.toLowerCase().trim(), m)
        await mergeTMDBMovies(movieMap, list, 'tmdbPopular')
        idx++
      }
      const r1 = results[idx]
      if (includeTMDBUpcoming && r1?.status === 'fulfilled') {
        const list = r1.value
        for (const m of list) tmdbTitleMap.set(m.title.toLowerCase().trim(), m)
        await mergeTMDBMovies(movieMap, list, 'tmdbUpcoming')
      }
    }
    const toEnrich = Array.from(movieMap.values()).filter((m) => !m.tmdbId)
    if (toEnrich.length) {
      const enriched = await batchEnrichMoviesWithTMDB(toEnrich, tmdbTitleMap)
      for (let i = 0; i < toEnrich.length; i++) movieMap.set(toEnrich[i].name.toLowerCase().trim(), enriched[i])
    }
  }
  const list = Array.from(movieMap.values())
  logger.info(`Final merged list: ${list.length} unique movies`)
  return list
}

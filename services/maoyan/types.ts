/**
 * Maoyan API type definitions
 */

/** Top rated movies list response */
export interface TopRatedMoviesResponse {
  title: string
  movieList: MovieListItem[]
}

/** Top rated movie item */
export interface MovieListItem {
  movieId: number
  poster: string
  score: string
  name: string
}

/** Most expected movie item */
export interface ComingMovie {
  id: number
  img: string
  wish: number
  wishst: number
  nm: string
  comingTitle: string
}

/** Most expected movies list response */
export interface MostExpectedResponse {
  coming: ComingMovie[]
  paging: { hasMore: boolean; limit: number; offset: number; total: number }
}

/** Merged movie (Maoyan + TMDB) */
export interface MergedMovie {
  maoyanId: number | string
  name: string
  poster: string
  score?: string
  wish?: number
  source: 'topRated' | 'mostExpected' | 'tmdbPopular' | 'tmdbUpcoming'
  sources: ('topRated' | 'mostExpected' | 'tmdbPopular' | 'tmdbUpcoming')[]
  maoyanUrl?: string
  tmdbId?: number
  tmdbPoster?: string
  overview?: string
  releaseDate?: string
  year?: number
  rating?: number
  tmdbVoteCount?: number
  popularity?: number
  tmdbUrl?: string
  genres?: string[]
  insertedAt?: number
  updatedAt?: number
}

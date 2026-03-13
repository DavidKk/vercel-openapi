import { getMoviesListWithTimestamp } from '@/services/movies'

import { MovieList } from './components'

/**
 * Movies overview page content: used inside /movies layout.
 * Fetches latest movies from cache and renders list.
 */
export default async function MoviesPage() {
  const { movies, cachedAt } = await getMoviesListWithTimestamp()
  return (
    <section className="flex h-full flex-col">
      <MovieList movies={movies} cachedAt={cachedAt} />
    </section>
  )
}

import { MoviesOverviewLoader } from './components'

/**
 * Movies overview page. Data is loaded client-side (IDB cache then API) to reduce API requests.
 */
export default function MoviesPage() {
  return (
    <section className="flex h-full flex-col">
      <MoviesOverviewLoader />
    </section>
  )
}

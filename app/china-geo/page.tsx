import { GeoClient } from './components'

/**
 * China GEO overview page content. Used inside /geo layout.
 * Read-only: user can only trigger "Use my location"; address cannot be entered. Debug panel is registered here.
 */
export default function GeoPage() {
  return (
    <section className="flex h-full flex-col">
      <GeoClient />
    </section>
  )
}

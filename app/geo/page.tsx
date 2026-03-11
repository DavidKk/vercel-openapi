import { GeoClient } from './components'

/**
 * Geolocation overview page content. Used inside /geo layout.
 * Renders the geocoding form and result panel.
 */
export default function GeoPage() {
  return (
    <section className="flex h-full flex-col">
      <GeoClient />
    </section>
  )
}

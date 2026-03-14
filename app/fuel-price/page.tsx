import { FuelPriceOverviewLoader } from './components'

/**
 * Fuel price overview page. Data is loaded client-side (IDB cache then API) to reduce API requests.
 */
export default function FuelPricePage() {
  return (
    <section className="flex h-full flex-col">
      <FuelPriceOverviewLoader />
    </section>
  )
}

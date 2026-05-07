import { FuelPriceOverviewLoader } from './components'

/**
 * China Fuel Price overview page. Data is loaded client-side (IDB cache then API) to reduce API requests.
 */
export default function FuelPricePage() {
  return (
    <section className="flex h-full flex-col">
      <FuelPriceOverviewLoader />
    </section>
  )
}

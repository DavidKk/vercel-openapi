import { PricesOverviewLoader } from './components/PricesOverviewLoader'

/**
 * Prices overview page. Data is loaded client-side (IDB cache then API) to reduce requests.
 * @returns Overview page content
 */
export default function PricesPage() {
  return (
    <section className="flex h-full flex-col p-0">
      <PricesOverviewLoader />
    </section>
  )
}

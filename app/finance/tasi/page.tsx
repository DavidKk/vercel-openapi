import { TasiOverviewLoader } from '../components'

/**
 * TASI market overview page. Data is loaded client-side (IDB-first then API) so browser cache is used.
 * Used at /finance/tasi.
 */
export default function FinanceTasiPage() {
  return (
    <section className="flex h-full flex-col">
      <TasiOverviewLoader />
    </section>
  )
}

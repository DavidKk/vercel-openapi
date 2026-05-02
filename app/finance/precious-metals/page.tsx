import { QuoteLiteOverview } from '../components/QuoteLiteOverview'

/**
 * Precious metals overview (spot XAUUSD demo only today; more symbols and APIs later).
 */
export default function FinancePreciousMetalsPage() {
  return (
    <section className="flex h-full flex-col">
      <QuoteLiteOverview />
    </section>
  )
}

import { ExchangeRateServer } from './components'

/**
 * Exchange rate overview page: used inside /exchange-rate layout.
 * Renders currency converter with cached rates.
 */
export default function ExchangeRatePage() {
  return (
    <section className="flex h-full flex-col">
      <ExchangeRateServer />
    </section>
  )
}

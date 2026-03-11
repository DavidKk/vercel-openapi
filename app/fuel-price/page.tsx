import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'

import { FuelPriceTable } from './components'

/**
 * Fuel price page content: used inside /fuel-price layout.
 * Layout is responsible for header and sidebar; this page only renders content sections.
 */
export default async function FuelPricePage() {
  const fuelPrices = await getCachedFuelPrice()

  return (
    <section id="fuel-overview" className="flex h-full flex-col">
      <FuelPriceTable fuelPrices={fuelPrices} />
    </section>
  )
}

// Revalidation time in seconds
export const revalidate = 3600 // Revalidate every hour

// Disable static generation, force server-side rendering
export const dynamic = 'force-dynamic'

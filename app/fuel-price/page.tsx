import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'

import { FuelPriceTable } from './FuelPriceTable'

/**
 * Fuel price page component
 * Displays current fuel prices for all provinces with user location highlighting
 */
export default async function FuelPricePage() {
  const fuelPrices = await getCachedFuelPrice()
  return <FuelPriceTable fuelPrices={fuelPrices} />
}

// Revalidation time in seconds
export const revalidate = 3600 // Revalidate every hour

// Disable static generation, force server-side rendering
export const dynamic = 'force-dynamic'

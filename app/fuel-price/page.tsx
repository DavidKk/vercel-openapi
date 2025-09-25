import { FuelPriceTable } from './FuelPriceTable'
import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'

export default async function FuelPricePage() {
  const fuelPrices = await getCachedFuelPrice()
  return <FuelPriceTable fuelPrices={fuelPrices} />
}

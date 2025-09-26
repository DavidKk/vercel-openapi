import { createMCPHttpServer } from '@/initializer/mcp'
import { version } from '@/package.json'
import listFuelPrices from './listFuelPrices'
import getProvinceFuelPrice from './getProvinceFuelPrice'
import calcRechargePromo from './calcRechargePromo'

const name = 'fuel-price-service'
const description = 'Provides fuel price query service for provinces and cities in China'

export const { manifest: GET, execute: POST } = createMCPHttpServer(name, version, description, {
  listFuelPrices,
  getProvinceFuelPrice,
  calcRechargePromo,
})

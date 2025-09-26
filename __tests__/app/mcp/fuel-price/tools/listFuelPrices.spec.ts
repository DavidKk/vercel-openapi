import listFuelPrices from '@/app/mcp/fuel-price/listFuelPrices'
import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'

// Mock the API functions
jest.mock('@/app/actions/fuel-price/api', () => ({
  getCachedFuelPrice: jest.fn(),
}))

describe('MCP Fuel Price Tool: listFuelPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(listFuelPrices.name).toBe('list_fuel_prices')
    expect(listFuelPrices.description).toBe('Get fuel price list for all provinces and cities in China')
  })

  it('should call getCachedFuelPrice when executed', async () => {
    const mockFuelPrices = [
      { province: 'Beijing', diesel: 7.5, gasoline92: 8.0, gasoline95: 8.5 },
      { province: 'Shanghai', diesel: 7.4, gasoline92: 7.9, gasoline95: 8.4 },
    ]

    ;(getCachedFuelPrice as jest.Mock).mockResolvedValue(mockFuelPrices)

    const result = await listFuelPrices.call({})

    expect(result).toEqual(mockFuelPrices)
    expect(getCachedFuelPrice).toHaveBeenCalled()
  })

  it('should validate parameters correctly', () => {
    const validResult = listFuelPrices.validateParameters({})
    expect(validResult).toBe(true)
  })

  it('should handle errors from getCachedFuelPrice', async () => {
    const errorMessage = 'Failed to fetch fuel prices'
    ;(getCachedFuelPrice as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(listFuelPrices.call({})).rejects.toThrow(errorMessage)
  })
})

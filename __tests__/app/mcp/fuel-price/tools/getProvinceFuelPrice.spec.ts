import getProvinceFuelPrice from '@/app/mcp/fuel-price/getProvinceFuelPrice'
import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'

// Mock the API functions
jest.mock('@/app/actions/fuel-price/api', () => ({
  getCachedProvinceFuelPrice: jest.fn(),
}))

describe('MCP Fuel Price Tool: getProvinceFuelPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(getProvinceFuelPrice.name).toBe('get_province_fuel_price')
    expect(getProvinceFuelPrice.description).toBe('Get fuel price for a specified province')
  })

  it('should call getCachedProvinceFuelPrice with correct parameter when executed', async () => {
    const mockProvinceFuelPrice = {
      province: 'Guangdong',
      diesel: 7.6,
      gasoline92: 8.1,
      gasoline95: 8.6,
    }

    ;(getCachedProvinceFuelPrice as jest.Mock).mockResolvedValue(mockProvinceFuelPrice)

    const result = await getProvinceFuelPrice.call({ province: 'Guangdong' })

    expect(result).toEqual(mockProvinceFuelPrice)
    expect(getCachedProvinceFuelPrice).toHaveBeenCalledWith('Guangdong')
  })

  it('should validate parameters correctly', () => {
    // Valid parameters
    const validResult = getProvinceFuelPrice.validateParameters({ province: 'Guangdong' })
    expect(validResult).toBe(true)

    // Invalid parameters - missing required field
    const invalidResult = getProvinceFuelPrice.validateParameters({})
    expect(typeof invalidResult).toBe('string') // Error message

    // Invalid parameters - wrong type
    const invalidTypeResult = getProvinceFuelPrice.validateParameters({ province: 123 })
    expect(typeof invalidTypeResult).toBe('string') // Error message
  })

  it('should handle errors from getCachedProvinceFuelPrice', async () => {
    const errorMessage = 'Failed to fetch province fuel prices'
    ;(getCachedProvinceFuelPrice as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(getProvinceFuelPrice.call({ province: 'Guangdong' })).rejects.toThrow(errorMessage)
  })
})

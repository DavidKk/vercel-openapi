import calcRechargePromo from '@/app/mcp/fuel-price/calcRechargePromo'
import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { calcRechargePromo as calculateRechargePromo } from '@/app/actions/fuel-price/promo'

// Mock the API functions
jest.mock('@/app/actions/fuel-price/api', () => ({
  getCachedProvinceFuelPrice: jest.fn(),
}))

// Mock the promo calculation function
jest.mock('@/app/actions/fuel-price/promo', () => ({
  calcRechargePromo: jest.fn(),
}))

describe('MCP Fuel Price Tool: calcRechargePromo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should have correct metadata', () => {
    expect(calcRechargePromo.name).toBe('calc_recharge_promo')
    expect(calcRechargePromo.description).toBe('Calculate fuel recharge promotion for a specified province')
  })

  it('should call getCachedProvinceFuelPrice and calculateRechargePromo with correct parameters when executed', async () => {
    const mockFuelPriceData = {
      current: {
        province: 'Guangdong',
        b92: '8.1',
        b95: '8.6',
        b98: '9.2',
        b0: '7.5',
      },
      latestUpdated: 1640995200000,
    }

    const mockCalcResult = {
      pay: 100,
      bonus: 20,
      balance: 120,
      liters: 14.81,
      effectivePrice: 6.75,
      savePerLiter: 1.35,
      totalSave: 20,
      remark: 'Spend 100 yuan, get 20 yuan bonus, total 120 yuan, can buy 14.81 liters, effective price 6.75 yuan/liter, save 1.35 yuan per liter',
    }

    ;(getCachedProvinceFuelPrice as jest.Mock).mockResolvedValue(mockFuelPriceData)
    ;(calculateRechargePromo as jest.Mock).mockReturnValue(mockCalcResult)

    const result = await calcRechargePromo.call({
      province: 'Guangdong',
      fuelType: 'b92',
      amount: 100,
      bonus: 20,
    })

    expect(result).toEqual({
      ...mockCalcResult,
      province: 'Guangdong',
      fuelType: 'b92',
      pricePerLiter: 8.1,
      amount: 100,
      latestUpdated: 1640995200000,
    })

    expect(getCachedProvinceFuelPrice).toHaveBeenCalledWith('Guangdong')
    expect(calculateRechargePromo).toHaveBeenCalledWith(8.1, 100, 20)
  })

  it('should validate parameters correctly', () => {
    // Valid parameters
    const validResult = calcRechargePromo.validateParameters({
      province: 'Guangdong',
      fuelType: 'b92',
      amount: 100,
      bonus: 20,
    })
    expect(validResult).toBe(true)

    // Valid parameters with default fuelType
    const validResult2 = calcRechargePromo.validateParameters({
      province: 'Guangdong',
      amount: 100,
      bonus: 20,
    })
    expect(validResult2).toBe(true)

    // Invalid parameters - missing required field
    const invalidResult1 = calcRechargePromo.validateParameters({
      province: 'Guangdong',
      amount: 100,
    })
    expect(typeof invalidResult1).toBe('string') // Error message

    // Invalid parameters - wrong type
    const invalidResult2 = calcRechargePromo.validateParameters({
      province: 'Guangdong',
      fuelType: 'invalid',
      amount: 100,
      bonus: 20,
    })
    expect(typeof invalidResult2).toBe('string') // Error message

    // Invalid parameters - negative amount
    const invalidResult3 = calcRechargePromo.validateParameters({
      province: 'Guangdong',
      amount: -100,
      bonus: 20,
    })
    expect(typeof invalidResult3).toBe('string') // Error message

    // Invalid parameters - negative bonus
    const invalidResult4 = calcRechargePromo.validateParameters({
      province: 'Guangdong',
      amount: 100,
      bonus: -20,
    })
    expect(typeof invalidResult4).toBe('string') // Error message
  })

  it('should handle errors from getCachedProvinceFuelPrice', async () => {
    const errorMessage = 'Failed to fetch province fuel prices'
    ;(getCachedProvinceFuelPrice as jest.Mock).mockRejectedValue(new Error(errorMessage))

    await expect(
      calcRechargePromo.call({
        province: 'Guangdong',
        fuelType: 'b92',
        amount: 100,
        bonus: 20,
      })
    ).rejects.toThrow(errorMessage)
  })

  it('should handle case when no fuel price data found for province', async () => {
    const mockFuelPriceData = {
      current: null,
      latestUpdated: 1640995200000,
    }

    ;(getCachedProvinceFuelPrice as jest.Mock).mockResolvedValue(mockFuelPriceData)

    await expect(
      calcRechargePromo.call({
        province: 'InvalidProvince',
        fuelType: 'b92',
        amount: 100,
        bonus: 20,
      })
    ).rejects.toThrow('No fuel price data found for province: InvalidProvince')
  })

  it('should handle case when invalid price for fuel type', async () => {
    const mockFuelPriceData = {
      current: {
        province: 'Guangdong',
        b92: 'invalid',
        b95: '8.6',
        b98: '9.2',
        b0: '7.5',
      },
      latestUpdated: 1640995200000,
    }

    ;(getCachedProvinceFuelPrice as jest.Mock).mockResolvedValue(mockFuelPriceData)

    await expect(
      calcRechargePromo.call({
        province: 'Guangdong',
        fuelType: 'b92',
        amount: 100,
        bonus: 20,
      })
    ).rejects.toThrow('Invalid price for fuel type b92 in province Guangdong')
  })
})

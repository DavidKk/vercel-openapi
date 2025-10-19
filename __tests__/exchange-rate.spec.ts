import { clearExchangeRateCache, convertCurrency, getCachedExchangeRate, getExchangeRate } from '@/app/actions/exchange-rate/api'
import { isConversionRequest, isCurrencyConversion, isExchangeRateData, isExchangeRateResponse } from '@/app/actions/exchange-rate/types'

// Mock fetchWithCache function
jest.mock('@/services/fetch', () => ({
  fetchWithCache: jest.fn(),
}))

// Import the mocked fetchWithCache
import { fetchWithCache } from '@/services/fetch'

describe('Exchange Rate Module', () => {
  const mockResponse = {
    base: 'USD',
    date: '2023-01-01',
    rates: {
      EUR: 0.85,
      GBP: 0.75,
    },
  }

  beforeEach(() => {
    // Clear cache before each test
    clearExchangeRateCache()

    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  describe('Type Guards', () => {
    test('should validate ExchangeRateData correctly', () => {
      const validData = {
        base: 'USD',
        date: '2023-01-01',
        rates: {
          EUR: 0.85,
          GBP: 0.75,
        },
      }

      const invalidData = {
        base: 'USD',
        date: '2023-01-01',
        rates: {
          EUR: 'invalid' as any,
          GBP: 0.75,
        },
      }

      expect(isExchangeRateData(validData)).toBe(true)
      expect(isExchangeRateData(invalidData)).toBe(false)
      expect(isExchangeRateData(null)).toBe(false)
      expect(isExchangeRateData(undefined)).toBe(false)
    })

    test('should validate ExchangeRateResponse correctly', () => {
      const validResponse = {
        data: {
          base: 'USD',
          date: '2023-01-01',
          rates: {
            EUR: 0.85,
            GBP: 0.75,
          },
        },
        lastUpdated: '2023-01-01T00:00:00Z',
      }

      const invalidResponse = {
        data: {
          base: 'USD',
          date: '2023-01-01',
          rates: {
            EUR: 0.85,
            GBP: 0.75,
          },
        },
        // missing lastUpdated
      } as any

      expect(isExchangeRateResponse(validResponse)).toBe(true)
      expect(isExchangeRateResponse(invalidResponse)).toBe(false)
    })

    test('should validate CurrencyConversion correctly', () => {
      const validConversion = {
        from: 'USD',
        to: 'EUR',
        amount: 100,
        result: 85,
        rate: 0.85,
        date: '2023-01-01',
      }

      const invalidConversion = {
        from: 'USD',
        to: 'EUR',
        amount: 100,
        // missing other required fields
      } as any

      expect(isCurrencyConversion(validConversion)).toBe(true)
      expect(isCurrencyConversion(invalidConversion)).toBe(false)
    })

    test('should validate ConversionRequest correctly', () => {
      const validRequest = {
        from: 'USD',
        to: 'EUR',
        amount: 100,
      }

      const invalidRequest = {
        from: 'USD',
        to: 'EUR',
        // missing amount
      } as any

      expect(isConversionRequest(validRequest)).toBe(true)
      expect(isConversionRequest(invalidRequest)).toBe(false)
    })
  })

  describe('API Functions', () => {
    test('should fetch exchange rates successfully', async () => {
      // Mock fetchWithCache to return the mock response
      ;(fetchWithCache as jest.Mock).mockResolvedValue(new TextEncoder().encode(JSON.stringify(mockResponse)).buffer)

      const result = await getExchangeRate('USD')
      expect(result).toEqual(mockResponse)
    })

    test('should handle fetch errors', async () => {
      // Mock fetchWithCache to throw an error
      ;(fetchWithCache as jest.Mock).mockRejectedValue(new Error('HTTP error! Status: 500'))

      await expect(getExchangeRate('USD')).rejects.toThrow('HTTP error! Status: 500')
    })

    test('should handle invalid response data', async () => {
      // Mock fetchWithCache to return invalid data
      ;(fetchWithCache as jest.Mock).mockResolvedValue(new TextEncoder().encode(JSON.stringify({ invalid: 'data' })).buffer)

      await expect(getExchangeRate('USD')).rejects.toThrow('Invalid exchange rate data format')
    })

    test('should cache exchange rates', async () => {
      // Mock fetchWithCache to return the mock response
      ;(fetchWithCache as jest.Mock).mockResolvedValue(new TextEncoder().encode(JSON.stringify(mockResponse)).buffer)

      // First call should hit the API
      const result1 = await getCachedExchangeRate('USD')
      expect(fetchWithCache).toHaveBeenCalledTimes(1)
      expect(result1).toEqual(mockResponse)

      // Wait a bit to ensure cache is used
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Second call should use cache
      const result2 = await getCachedExchangeRate('USD')
      expect(fetchWithCache).toHaveBeenCalledTimes(1) // Still only called once
      expect(result2).toEqual(mockResponse)
    })

    test('should convert currency correctly', async () => {
      // Mock fetchWithCache to return the mock response
      ;(fetchWithCache as jest.Mock).mockResolvedValue(new TextEncoder().encode(JSON.stringify(mockResponse)).buffer)

      const conversionRequest = {
        from: 'USD',
        to: 'EUR',
        amount: 100,
      }

      const result = await convertCurrency(conversionRequest)

      expect(result).toEqual({
        from: 'USD',
        to: 'EUR',
        amount: 100,
        result: 85,
        rate: 0.85,
        date: '2023-01-01',
      })
    })

    test('should handle same currency conversion', async () => {
      // Mock fetchWithCache to return the mock response
      ;(fetchWithCache as jest.Mock).mockResolvedValue(new TextEncoder().encode(JSON.stringify(mockResponse)).buffer)

      const conversionRequest = {
        from: 'USD',
        to: 'USD',
        amount: 100,
      }

      const result = await convertCurrency(conversionRequest)

      expect(result).toEqual({
        from: 'USD',
        to: 'USD',
        amount: 100,
        result: 100,
        rate: 1,
        date: '2023-01-01',
      })
    })

    test('should handle conversion with unknown target currency', async () => {
      // Mock fetchWithCache to return the mock response
      ;(fetchWithCache as jest.Mock).mockResolvedValue(new TextEncoder().encode(JSON.stringify(mockResponse)).buffer)

      const conversionRequest = {
        from: 'USD',
        to: 'JPY', // Not in rates
        amount: 100,
      }

      await expect(convertCurrency(conversionRequest)).rejects.toThrow('Target currency JPY not found in exchange rates')
    })
  })
})

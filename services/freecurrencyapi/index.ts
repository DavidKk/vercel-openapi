import { type ConversionRequest, type CurrencyConversion, type ExchangeRateData, isExchangeRateData } from '@/app/actions/exchange-rate/types'
import { fetchWithCache } from '@/services/fetch'

// ExchangeRate-API endpoint
const EXCHANGE_RATE_API_BASE = 'https://api.exchangerate-api.com/v4/latest'

interface MemoryCache {
  data: ExchangeRateData | null
  timestamp: number
}

/** Memory cache storage */
const MEMORY_CACHE: MemoryCache = {
  data: null,
  timestamp: 0,
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

/**
 * Clear the in-memory cache
 */
export function clearExchangeRateCache() {
  MEMORY_CACHE.data = null
  MEMORY_CACHE.timestamp = 0
}

/**
 * Get exchange rate data from ExchangeRate-API
 * @param baseCurrency Base currency code (e.g., 'USD')
 * @returns Promise<ExchangeRateData>
 */
export async function getExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  try {
    // For testing purposes, we're using the free endpoint which doesn't require an API key
    // The API key provided is for the paid service
    const url = `${EXCHANGE_RATE_API_BASE}/${baseCurrency}`
    const dataBuffer = await fetchWithCache(url)

    // Convert ArrayBuffer to JSON
    const jsonData = new TextDecoder().decode(dataBuffer)
    const data = JSON.parse(jsonData)

    // Validate the response data
    if (!isExchangeRateData(data)) {
      throw new Error('Invalid exchange rate data format')
    }

    return data
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching exchange rates:', error)
    throw error
  }
}

/**
 * Get exchange rate data with caching
 * @param baseCurrency Base currency code (e.g., 'USD')
 * @returns Promise<ExchangeRateData>
 */
export async function getCachedExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  const now = Date.now()

  // Check memory cache
  if (MEMORY_CACHE.data && MEMORY_CACHE.data.base === baseCurrency && now - MEMORY_CACHE.timestamp < CACHE_DURATION) {
    return MEMORY_CACHE.data
  }

  // Get fresh data
  try {
    const freshData = await getExchangeRate(baseCurrency)

    // Update memory cache
    MEMORY_CACHE.data = freshData
    MEMORY_CACHE.timestamp = now

    return freshData
  } catch (error) {
    // If fetching new data fails but we have cached data, use cached data
    if (MEMORY_CACHE.data && MEMORY_CACHE.data.base === baseCurrency) {
      return MEMORY_CACHE.data
    }

    // If no cached data and fetching new data fails, throw error
    throw error
  }
}

/**
 * Convert currency amount from one currency to another
 * @param request Conversion request containing from, to, and amount
 * @returns Promise<CurrencyConversion>
 */
export async function convertCurrency(request: ConversionRequest): Promise<CurrencyConversion> {
  const { from, to, amount } = request

  // Get exchange rates with base currency as 'from' currency
  const exchangeRateData = await getCachedExchangeRate(from)

  // For same currency conversion
  if (from === to) {
    return {
      from,
      to,
      amount,
      result: amount,
      rate: 1,
      date: exchangeRateData.date,
    }
  }

  // Check if target currency exists in rates
  if (!(to in exchangeRateData.rates)) {
    throw new Error(`Target currency ${to} not found in exchange rates`)
  }

  // Get the rate for target currency
  const rate = exchangeRateData.rates[to]

  // Calculate converted amount
  const result = parseFloat((amount * rate).toFixed(2))

  return {
    from,
    to,
    amount,
    result,
    rate,
    date: exchangeRateData.date,
  }
}

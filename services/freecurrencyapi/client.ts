import { type ExchangeRateData, isExchangeRateData } from '@/app/actions/exchange-rate/types'
import { fetchWithCache } from '@/services/fetch'
import { createLogger } from '@/services/logger'

import { EXCHANGE_RATE_API_BASE, FREECURRENCYAPI_BASE } from './constants'

const logger = createLogger('exchange-rate')

/** FreeCurrencyAPI.com response shape (v1/latest). */
interface FreeCurrencyApiResponse {
  data?: Record<string, number>
  meta?: { last_updated_at?: string }
}

/**
 * Fetch exchange rate data. Uses FreeCurrencyAPI.com when FREECURRENCYAPI_API_KEY is set (recommended to avoid IP limits); otherwise falls back to ExchangeRate-API.com (no key).
 * @param baseCurrency Base currency code (e.g. 'USD')
 * @returns Promise resolving to exchange rate data
 */
export async function getExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  const apiKey = process.env.FREECURRENCYAPI_API_KEY

  if (apiKey) {
    try {
      const url = `${FREECURRENCYAPI_BASE}?apikey=${encodeURIComponent(apiKey)}&base_currency=${encodeURIComponent(baseCurrency)}`
      const dataBuffer = await fetchWithCache(url)
      const json = new TextDecoder().decode(dataBuffer)
      const res = JSON.parse(json) as FreeCurrencyApiResponse
      if (!res.data || typeof res.data !== 'object') {
        throw new Error('FreeCurrencyAPI returned invalid data')
      }
      const date = res.meta?.last_updated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
      const payload: ExchangeRateData = { base: baseCurrency, date, rates: res.data }
      return payload
    } catch (error) {
      logger.fail('Error fetching exchange rates from FreeCurrencyAPI:', error)
      throw error
    }
  }

  try {
    const url = `${EXCHANGE_RATE_API_BASE}/${baseCurrency}`
    const dataBuffer = await fetchWithCache(url)
    const jsonData = new TextDecoder().decode(dataBuffer)
    const data = JSON.parse(jsonData)

    if (!isExchangeRateData(data)) {
      throw new Error('Invalid exchange rate data format')
    }

    return data
  } catch (error) {
    logger.fail('Error fetching exchange rates:', error)
    throw error
  }
}

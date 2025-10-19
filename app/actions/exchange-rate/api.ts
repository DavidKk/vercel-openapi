import { clearExchangeRateCache as clearCache, convertCurrency as convert, getCachedExchangeRate as getCachedRate, getExchangeRate as getRate } from '@/services/freecurrencyapi'

import type { ConversionRequest, CurrencyConversion, ExchangeRateData } from './types'

/**
 * Clear the exchange rate cache
 */
export function clearExchangeRateCache() {
  return clearCache()
}

/**
 * Get exchange rate data with caching
 * @param baseCurrency Base currency code (e.g., 'USD')
 * @returns Promise<ExchangeRateData>
 */
export async function getExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  // Validate base currency parameter
  if (!baseCurrency || typeof baseCurrency !== 'string') {
    throw new Error('Invalid base currency parameter')
  }

  // Ensure currency code is uppercase
  const normalizedCurrency = baseCurrency.toUpperCase()

  return getRate(normalizedCurrency)
}

/**
 * Get exchange rate data with caching
 * @param baseCurrency Base currency code (e.g., 'USD')
 * @returns Promise<ExchangeRateData>
 */
export async function getCachedExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  // Validate base currency parameter
  if (!baseCurrency || typeof baseCurrency !== 'string') {
    throw new Error('Invalid base currency parameter')
  }

  // Ensure currency code is uppercase
  const normalizedCurrency = baseCurrency.toUpperCase()

  return getCachedRate(normalizedCurrency)
}

/**
 * Convert currency amount from one currency to another
 * @param request Conversion request containing from, to, and amount
 * @returns Promise<CurrencyConversion>
 */
export async function convertCurrency(request: ConversionRequest): Promise<CurrencyConversion> {
  // Validate request parameters
  if (!request || typeof request !== 'object') {
    throw new Error('Invalid conversion request')
  }

  if (!request.from || typeof request.from !== 'string') {
    throw new Error('Invalid "from" currency parameter')
  }

  if (!request.to || typeof request.to !== 'string') {
    throw new Error('Invalid "to" currency parameter')
  }

  if (typeof request.amount !== 'number' || isNaN(request.amount)) {
    throw new Error('Invalid amount parameter')
  }

  // Ensure currency codes are uppercase
  const normalizedRequest: ConversionRequest = {
    from: request.from.toUpperCase(),
    to: request.to.toUpperCase(),
    amount: request.amount,
  }

  return convert(normalizedRequest)
}

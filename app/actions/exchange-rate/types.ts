export interface ExchangeRateData {
  base: string // Base currency code
  date: string // Date of the exchange rates
  rates: Record<string, number> // Currency code to exchange rate mapping
}

/**
 * Type guard to check if an object is of type ExchangeRateData
 * @param obj The object to check
 * @returns boolean True if the object is of type ExchangeRateData, false otherwise
 */
export function isExchangeRateData(obj: any): obj is ExchangeRateData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.base === 'string' &&
    typeof obj.date === 'string' &&
    typeof obj.rates === 'object' &&
    obj.rates !== null &&
    Object.keys(obj.rates).every((key) => typeof key === 'string' && typeof obj.rates[key] === 'number')
  )
}

// Define response structure
export interface ExchangeRateResponse {
  data: ExchangeRateData
  lastUpdated: string
}

/**
 * Type guard to check if an object is of type ExchangeRateResponse
 * @param obj The object to check
 * @returns boolean True if the object is of type ExchangeRateResponse, false otherwise
 */
export function isExchangeRateResponse(obj: any): obj is ExchangeRateResponse {
  return obj !== null && typeof obj === 'object' && typeof obj.lastUpdated === 'string' && isExchangeRateData(obj.data)
}

// Define structure for currency conversion
export interface CurrencyConversion {
  from: string // Source currency code
  to: string // Target currency code
  amount: number // Amount to convert
  result: number // Converted amount
  rate: number // Exchange rate used
  date: string // Date of the exchange rate
}

/**
 * Type guard to check if an object is of type CurrencyConversion
 * @param obj The object to check
 * @returns boolean True if the object is of type CurrencyConversion, false otherwise
 */
export function isCurrencyConversion(obj: any): obj is CurrencyConversion {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.from === 'string' &&
    typeof obj.to === 'string' &&
    typeof obj.amount === 'number' &&
    typeof obj.result === 'number' &&
    typeof obj.rate === 'number' &&
    typeof obj.date === 'string'
  )
}

// Define structure for currency conversion request
export interface ConversionRequest {
  from: string // Source currency code
  to: string // Target currency code
  amount: number // Amount to convert
}

/**
 * Type guard to check if an object is of type ConversionRequest
 * @param obj The object to check
 * @returns boolean True if the object is of type ConversionRequest, false otherwise
 */
export function isConversionRequest(obj: any): obj is ConversionRequest {
  return obj !== null && typeof obj === 'object' && typeof obj.from === 'string' && typeof obj.to === 'string' && typeof obj.amount === 'number'
}

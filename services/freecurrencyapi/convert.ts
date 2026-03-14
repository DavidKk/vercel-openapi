import type { ConversionRequest, CurrencyConversion, ExchangeRateData } from '@/app/actions/exchange-rate/types'

/**
 * Convert an amount from one currency to another using given rate data
 * @param request Conversion request (from, to, amount)
 * @param exchangeRateData Exchange rate data with base = request.from
 * @returns CurrencyConversion result
 */
export function convertWithRates(request: ConversionRequest, exchangeRateData: ExchangeRateData): CurrencyConversion {
  const { from, to, amount } = request

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

  if (!(to in exchangeRateData.rates)) {
    throw new Error(`Target currency ${to} not found in exchange rates`)
  }

  const rate = exchangeRateData.rates[to]
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

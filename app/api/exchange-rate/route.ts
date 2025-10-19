import { convertCurrency, getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import { isConversionRequest } from '@/app/actions/exchange-rate/types'
import { api } from '@/initializer/controller'
import { invalidParameters, jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

/**
 * GET handler for exchange rate API endpoint
 * Returns current exchange rates for a base currency
 * Query parameters:
 * - base: Base currency code (default: USD)
 */
export const GET = api(async (req, context) => {
  const { searchParams } = context
  const baseCurrency = searchParams.get('base') || 'USD'

  // Validate base currency parameter
  if (!baseCurrency || typeof baseCurrency !== 'string') {
    return invalidParameters('Invalid base currency parameter').toJsonResponse(400)
  }

  const exchangeRateData = await getCachedExchangeRate(baseCurrency)

  return jsonSuccess(exchangeRateData, {
    headers: new Headers({
      Charset: 'utf-8',
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60', // 5 minutes cache
    }),
  })
})

/**
 * POST handler for currency conversion API endpoint
 * Converts an amount from one currency to another
 * Request body should contain:
 * {
 *   "from": "USD",
 *   "to": "EUR",
 *   "amount": 100
 * }
 */
export const POST = api(async (req) => {
  try {
    const body = await req.json()
    // Validate request body
    if (!isConversionRequest(body)) {
      return invalidParameters('Invalid request body. Expected {from: string, to: string, amount: number}').toJsonResponse(400)
    }

    const conversionResult = await convertCurrency(body)
    return jsonSuccess(conversionResult, {
      headers: new Headers({
        Charset: 'utf-8',
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=60', // 5 minutes cache
      }),
    })
  } catch (error) {
    return invalidParameters(`Invalid request: ${error instanceof Error ? error.message : 'Unknown error'}`).toJsonResponse(400)
  }
})

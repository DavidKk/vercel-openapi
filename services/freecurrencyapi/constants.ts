/** FreeCurrencyAPI.com (optional). When FREECURRENCYAPI_API_KEY is set, used to avoid IP-based limits. */
export const FREECURRENCYAPI_BASE = 'https://api.freecurrencyapi.com/v1/latest'

/** ExchangeRate-API.com fallback (no API key; free tier has IP/request limits). */
export const EXCHANGE_RATE_API_BASE = 'https://api.exchangerate-api.com/v4/latest'

/** In-memory cache TTL in milliseconds (5 minutes) */
export const CACHE_DURATION_MS = 5 * 60 * 1000

import { decodeBase64Url } from '@/utils/url-base64'

/** FreeCurrencyAPI.com (optional). When FREECURRENCYAPI_API_KEY is set, used to avoid IP-based limits. */
export const FREECURRENCYAPI_BASE = decodeBase64Url('aHR0cHM6Ly9hcGkuZnJlZWN1cnJlbmN5YXBpLmNvbS92MS9sYXRlc3Q=')

/** ExchangeRate-API.com fallback (no API key; free tier has IP/request limits). */
export const EXCHANGE_RATE_API_BASE = decodeBase64Url('aHR0cHM6Ly9hcGkuZXhjaGFuZ2VyYXRlLWFwaS5jb20vdjQvbGF0ZXN0')

/** In-memory cache TTL in milliseconds (5 minutes) */
export const CACHE_DURATION_MS = 5 * 60 * 1000

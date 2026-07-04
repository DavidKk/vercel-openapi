/**
 * SAHMK Developer API HTTP client (Tadawul / TASI market data).
 * Docs: https://www.sahmk.sa/en/developers/docs
 */

import { createLogger } from '@/services/logger'

const logger = createLogger('finance-tasi-sahmk-client')

const SAHMK_DEFAULT_BASE = 'https://app.sahmk.sa/api/v1'
const SAHMK_MAX_RETRIES = 5

export interface SahmkConfig {
  apiKey: string
  base: string
}

/**
 * Resolve SAHMK API credentials from environment.
 * @returns API key and base URL
 */
export function getSahmkConfig(): SahmkConfig {
  const apiKey = process.env.SAHMK_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('SAHMK_API_KEY is not set')
  }
  const base = (process.env.SAHMK_API_BASE_URL?.trim() || SAHMK_DEFAULT_BASE).replace(/\/$/, '')
  return { apiKey, base }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Parse SAHMK throttle wait time from response headers or JSON body.
 * @param response Fetch response
 * @param bodyText Raw response text
 * @returns Milliseconds to wait before retry
 */
export function parseSahmkRetryAfterMs(response: Response, bodyText: string): number {
  const header = response.headers.get('Retry-After')
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000) + 250
    }
  }

  const match = bodyText.match(/Expected available in (\d+)\s*seconds?/i)
  if (match) {
    return (Number(match[1]) + 1) * 1000
  }

  return 5000
}

function formatSahmkError(status: number, body: unknown, text: string): string {
  if (body != null && typeof body === 'object') {
    if ('error' in body) return JSON.stringify((body as { error?: unknown }).error)
    if ('detail' in body) return JSON.stringify((body as { detail?: unknown }).detail)
  }
  return text.slice(0, 300)
}

function isPlanRestrictedStatus(status: number): boolean {
  return status === 402 || status === 403
}

/**
 * Perform an authenticated GET request against the SAHMK API.
 * @param path API path (with or without leading slash)
 * @param searchParams Optional query string parameters
 * @returns Fetch Response
 */
export function sahmkFetch(path: string, searchParams?: Record<string, string>): Promise<Response> {
  const { apiKey, base } = getSahmkConfig()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalizedPath}`)
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== '') url.searchParams.set(key, value)
    }
  }
  return fetch(url.toString(), {
    headers: new Headers({
      'X-API-Key': apiKey,
      Accept: 'application/json',
    }),
  })
}

/**
 * GET JSON from SAHMK with automatic retry on HTTP 429 throttling.
 * @param path API path
 * @param context Short label for error messages
 * @param searchParams Optional query parameters
 * @returns Parsed JSON body
 */
export async function sahmkGetJson<T>(path: string, context: string, searchParams?: Record<string, string>): Promise<T> {
  let lastError = 'unknown error'

  for (let attempt = 0; attempt <= SAHMK_MAX_RETRIES; attempt++) {
    const response = await sahmkFetch(path, searchParams)
    const text = await response.text()
    let body: unknown = text
    try {
      body = JSON.parse(text) as unknown
    } catch {
      // keep raw text
    }

    if (response.status === 429 && attempt < SAHMK_MAX_RETRIES) {
      const waitMs = parseSahmkRetryAfterMs(response, text)
      logger.warn('SAHMK throttled, retrying', { context, attempt: attempt + 1, waitMs })
      await sleep(waitMs)
      continue
    }

    if (!response.ok) {
      lastError = formatSahmkError(response.status, body, text)
      const err = new Error(`SAHMK ${context} failed (${response.status}): ${lastError}`) as Error & {
        status?: number
        planRestricted?: boolean
      }
      err.status = response.status
      err.planRestricted = isPlanRestrictedStatus(response.status)
      throw err
    }

    if (body != null && typeof body === 'object' && 'error' in body) {
      throw new Error(`SAHMK ${context} error: ${JSON.stringify((body as { error?: unknown }).error)}`)
    }

    return body as T
  }

  throw new Error(`SAHMK ${context} failed after retries: ${lastError}`)
}

/**
 * Parse SAHMK JSON response or throw on HTTP / API errors (no retry).
 * @param response Fetch response
 * @param context Short label for error messages
 * @returns Parsed JSON body
 */
export async function sahmkReadJson<T>(response: Response, context: string): Promise<T> {
  const text = await response.text()
  let body: unknown = text
  try {
    body = JSON.parse(text) as unknown
  } catch {
    // keep raw text
  }

  if (!response.ok) {
    throw new Error(`SAHMK ${context} failed (${response.status}): ${formatSahmkError(response.status, body, text)}`)
  }

  if (body != null && typeof body === 'object' && 'error' in body) {
    throw new Error(`SAHMK ${context} error: ${JSON.stringify((body as { error?: unknown }).error)}`)
  }

  return body as T
}

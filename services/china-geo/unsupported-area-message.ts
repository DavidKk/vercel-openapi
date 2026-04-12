/**
 * User-facing copy when a coordinate is outside the China geo / weather service region,
 * or when reverse geocoding cannot resolve a supported area.
 */
export const CHINA_SERVICE_UNSUPPORTED_AREA_MESSAGE = 'This area is not supported for this service.'

/**
 * Whether a message from the client, API envelope (`message` field), or thrown Error
 * indicates the point is outside the supported service region.
 * @param text Raw error or API message string
 * @returns True when the UI should treat this as an unsupported-area case (amber styling, etc.)
 */
export function isChinaServiceUnsupportedAreaMessage(text: string): boolean {
  const t = text.trim()
  return t.includes('not supported for this service') || t.includes('This area is not supported')
}

/**
 * Build an Error for a failed forecast HTTP response, normalizing API JSON envelopes
 * so the client shows {@link CHINA_SERVICE_UNSUPPORTED_AREA_MESSAGE} instead of a raw JSON blob.
 * @param status HTTP status from `fetch`
 * @param bodyText Response body as text (JSON or plain)
 * @returns Error to throw from the forecast fetch path
 */
export function errorFromForecastHttpResponse(status: number, bodyText: string): Error {
  let messageFromJson: string | undefined
  try {
    const parsed = JSON.parse(bodyText) as { message?: string }
    if (typeof parsed?.message === 'string') {
      messageFromJson = parsed.message
    }
  } catch {
    // not JSON — use body as-is
  }
  const combined = (messageFromJson ?? bodyText).trim()
  if (isChinaServiceUnsupportedAreaMessage(combined)) {
    return new Error(CHINA_SERVICE_UNSUPPORTED_AREA_MESSAGE)
  }
  return new Error(`Forecast request failed (${status}): ${combined.slice(0, 500)}`)
}

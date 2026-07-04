import { parseSahmkRetryAfterMs } from '@/services/finance/tasi/sahmk-client'

describe('parseSahmkRetryAfterMs', () => {
  it('should parse Retry-After header in seconds', () => {
    const response = new Response(null, { headers: { 'Retry-After': '23' } })
    expect(parseSahmkRetryAfterMs(response, '')).toBe(23250)
  })

  it('should parse SAHMK detail message when header is missing', () => {
    const response = new Response(null)
    const body = '{"detail":"Request was throttled. Expected available in 23 seconds."}'
    expect(parseSahmkRetryAfterMs(response, body)).toBe(24000)
  })

  it('should return default wait when no hint is present', () => {
    const response = new Response(null)
    expect(parseSahmkRetryAfterMs(response, '{}')).toBe(5000)
  })
})

/**
 * Base64 encode/decode for URLs. Works in both Node (Buffer) and browser (btoa/atob)
 * so that third-party service URLs can be stored encoded and decoded at runtime,
 * avoiding plain-text URLs in the codebase.
 */

/**
 * Decode a Base64-encoded string to a URL (or any UTF-8 string).
 * Node: uses Buffer; browser: uses atob.
 * @param b64 Base64-encoded string
 * @returns Decoded string (e.g. full URL or domain)
 */
export function decodeBase64Url(b64: string): string {
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    return Buffer.from(b64, 'base64').toString('utf8')
  }
  return typeof atob !== 'undefined' ? atob(b64) : ''
}

/**
 * Encode a URL (or any string) to Base64 for storage in constants.
 * Node: uses Buffer; browser: uses btoa. Use this when adding new URLs (e.g. in dev).
 * @param url Plain URL or domain string
 * @returns Base64-encoded string
 */
export function encodeBase64Url(url: string): string {
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    return Buffer.from(url, 'utf8').toString('base64')
  }
  return typeof btoa !== 'undefined' ? btoa(url) : ''
}

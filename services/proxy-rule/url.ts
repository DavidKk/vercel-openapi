/**
 * Validate whether a string can be parsed as an HTTP(S) URL (or host with dot).
 */
export function isValidUrl(url: string): boolean {
  if (!url.includes('.')) {
    return false
  }

  try {
    new URL(url.startsWith('http') ? url : `http://${url}`)
    return true
  } catch {
    return false
  }
}

/**
 * Extract hostname from a URL-like string; returns empty string when parsing fails.
 */
export function tryGetDomain(url: string): string {
  if (!url.includes('.')) {
    return ''
  }

  try {
    const uri = new URL(url.startsWith('http') ? url : `http://${url}`)
    return uri.hostname
  } catch {
    return ''
  }
}

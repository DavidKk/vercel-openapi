/**
 * Strip tracking params and trivial differences so duplicate syndication collapses.
 * @param link Raw item link from RSS
 * @returns Normalized URL string or lowercased trimmed fallback when URL parsing fails
 */
export function normalizeLink(link: string): string {
  const trimmed = link.trim()
  if (!trimmed) {
    return ''
  }
  try {
    const u = new URL(trimmed)
    u.hash = ''
    for (const key of [...u.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) {
        u.searchParams.delete(key)
      }
    }
    let path = u.pathname
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1)
    }
    u.pathname = path || '/'
    return u.href
  } catch {
    return trimmed.toLowerCase()
  }
}

/**
 * Same-origin public base URL including path prefix when the app is not at domain root.
 * Matches the Skill tab pattern: pathname `/{...segments}/<module>/skill` → prefix is segments before `<module>/skill`.
 */
export function inferClientPublicBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const pathname = window.location.pathname || '/'
  const parts = pathname.split('/').filter(Boolean)
  const prefixParts = parts.length >= 2 ? parts.slice(0, parts.length - 2) : []
  const basePath = prefixParts.length > 0 ? `/${prefixParts.join('/')}` : ''
  return `${window.location.origin}${basePath}`
}

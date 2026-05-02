import { getMarketBySlug } from '@/app/finance/stock/marketRoute'

/**
 * Validate a `/finance/stock/:slug` segment for TASI-only exchange-feed API routes.
 *
 * @param slugRaw Dynamic route segment (e.g. `tasi`)
 * @returns Error message for HTTP 400, or null when the slug is `tasi`
 */
export function tasiFeedSlugErrorMessage(slugRaw: string): string | null {
  const slug = slugRaw.trim().toLowerCase()
  const market = getMarketBySlug(slug)
  if (!market) {
    return `Unknown stock slug "${slugRaw}". Use a slug from /finance/stock (e.g. tasi).`
  }
  if (market !== 'TASI') {
    return `This path only serves the TASI exchange feed (slug "tasi"). For ${market} use GET /api/finance/stock/summary?market=${encodeURIComponent(market)}`
  }
  return null
}

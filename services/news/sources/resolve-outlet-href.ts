import type { NewsSourceConfig } from '../types'

/**
 * Pick a URL users can open for a feed row: prefer the RSS item link when it looks like http(s), else the manifest homepage.
 * @param itemLink `link` from the parsed RSS entry
 * @param manifestSource Matching manifest row when available
 * @returns Non-empty URL string, or empty when neither side is usable
 */
export function resolveOutletHref(itemLink: string, manifestSource: NewsSourceConfig | undefined): string {
  const trimmed = itemLink.trim()
  if (trimmed && /^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  const fallback = manifestSource?.defaultUrl?.trim()
  if (fallback && /^https?:\/\//i.test(fallback)) {
    return fallback
  }
  return ''
}

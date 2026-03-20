/**
 * Module path segments that appear in the nav. Must stay in sync with NAV_ITEMS in index.tsx.
 */
const MODULE_SLUGS = new Set(['holiday', 'fuel-price', 'exchange-rate', 'geo', 'weather', 'movies', 'dns', 'finance', 'prices', 'proxy-rule'])

/**
 * Sub-path first segment that is shared across modules (e.g. mcp, api, skill, function-calling).
 * Only these are preserved when switching modules; module-specific paths (e.g. finance/tasi) are not.
 */
const SHARED_SUBPATH_PREFIXES = new Set(['mcp', 'api', 'skill', 'function-calling'])

/**
 * When current path is under a module and a shared sub-path (e.g. /fuel-price/mcp), return that sub-path (e.g. /mcp)
 * so nav links preserve it when switching modules (e.g. holiday -> /holiday/mcp).
 * Module-only paths (e.g. /finance/tasi) are not preserved, so clicking another module goes to its root.
 * @param pathname Current pathname (e.g. /dns/function-calling)
 * @returns Sub-path to preserve (e.g. /function-calling) or empty string
 */
export function getModuleSubPath(pathname: string | null): string {
  if (!pathname) return ''
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return ''
  const firstSegment = segments[0]
  const subFirst = segments[1]
  if (!MODULE_SLUGS.has(firstSegment) || !SHARED_SUBPATH_PREFIXES.has(subFirst)) return ''
  return '/' + segments.slice(1).join('/')
}

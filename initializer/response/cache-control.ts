/**
 * Cache-Control values for API routes.
 * Use with GET endpoints so browser and Vercel can cache by URL (same params = cache hit).
 *
 * **Clearing HTTP (CDN/browser) cache**
 * - Wait until `max-age` / `s-maxage` expire, or use `stale-while-revalidate` window behavior.
 * - Same URL ⇒ same cache entry; bust with a new query (e.g. `?v=2`) if you must force refetch before TTL.
 * - Vercel: use project dashboard / API to purge Data Cache or CDN when applicable (see Vercel docs for your plan).
 * - Application-layer caches (e.g. Turso, in-memory) are separate from these headers.
 */

/** One year in seconds. For stable, cacheable data (e.g. geo reverse geocode). */
export const CACHE_MAX_AGE_ONE_YEAR_S = 31536000

/**
 * Cache-Control header for long-lived cacheable GET responses.
 * Browser and CDN cache for 1 year; same URL returns from cache without hitting server.
 * Use for APIs that return large or expensive-to-compute data that rarely changes.
 */
export const CACHE_CONTROL_LONG_LIVED = `public, max-age=${CACHE_MAX_AGE_ONE_YEAR_S}, s-maxage=${CACHE_MAX_AGE_ONE_YEAR_S}, stale-while-revalidate=${CACHE_MAX_AGE_ONE_YEAR_S}`

/**
 * `private, no-store` — do not persist in shared caches (CDN/proxy) or long-lived private caches.
 * Use for auth, session-dependent JSON, writes, MCP/LLM, cron, and tool lists that change with login.
 */
export const CACHE_CONTROL_NO_STORE = 'private, no-store'

/**
 * Gist-backed public catalogs (e.g. prices): minute-level freshness per api-semantics / prices spec.
 */
export const CACHE_CONTROL_GIST_CATALOG = 'public, max-age=120, s-maxage=120, stale-while-revalidate=300'

/**
 * `/api/skills` manifest: same spirit as `/api/skills/[name]` (stable until deploy).
 */
export const CACHE_CONTROL_SKILLS_INDEX = 'public, max-age=600, s-maxage=600, stale-while-revalidate=1800'

/**
 * Stable HTTP redirects (e.g. film id → provider page): safe to cache at the edge for one day.
 */
export const CACHE_CONTROL_PROXY_REDIRECT = 'public, max-age=86400, s-maxage=86400'

/**
 * Build headers for responses that must not be cached (errors, auth, dynamic tools).
 * @returns Fresh Headers instance with Cache-Control: private, no-store
 */
export function cacheControlNoStoreHeaders(): Headers {
  return new Headers({ 'Cache-Control': CACHE_CONTROL_NO_STORE })
}

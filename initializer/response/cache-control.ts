/**
 * Cache-Control values for API routes.
 * Use with GET endpoints so browser and Vercel can cache by URL (same params = cache hit).
 */

/** One year in seconds. For stable, cacheable data (e.g. geo reverse geocode). */
export const CACHE_MAX_AGE_ONE_YEAR_S = 31536000

/**
 * Cache-Control header for long-lived cacheable GET responses.
 * Browser and CDN cache for 1 year; same URL returns from cache without hitting server.
 * Use for APIs that return large or expensive-to-compute data that rarely changes.
 */
export const CACHE_CONTROL_LONG_LIVED = `public, max-age=${CACHE_MAX_AGE_ONE_YEAR_S}, s-maxage=${CACHE_MAX_AGE_ONE_YEAR_S}, stale-while-revalidate=${CACHE_MAX_AGE_ONE_YEAR_S}`

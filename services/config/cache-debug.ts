/**
 * Debug / local overrides for application-level and HTTP response caching.
 */

/**
 * When true, callers should skip readable/writable caches (e.g. news merged-pool L1/L2/KV) and
 * standard JSON responses should use `Cache-Control: private, no-store` so browsers/CDN do not cache.
 *
 * **Default: caching stays on.** This is opt-in only: unset, empty, or any value other than `1` / `true` / `yes`
 * leaves normal caching behavior. Set `DISABLE_CACHE=1` in `.env.local` only for local debugging; avoid in production.
 *
 * @returns True only when env explicitly disables caching
 */
export function isAppCacheDisabled(): boolean {
  const v = process.env.DISABLE_CACHE?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

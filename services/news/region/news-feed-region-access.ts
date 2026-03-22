import type { NewsRegion } from '../types'

/**
 * Successful resolution: region filter for {@link filterNewsSources} and cache key segment.
 */
export type NewsFeedRegionAccessOk = {
  ok: true
  /** Second argument to `filterNewsSources`; `undefined` means all regions (signed-in, no `region` query). */
  regionFilter: NewsRegion | undefined
  /** `region` field for `buildNewsFeedPoolCacheKey` (empty string = all regions when authenticated). */
  regionCacheKey: string
}

/**
 * Anonymous user attempted to use hk_tw or intl.
 */
export type NewsFeedRegionAccessDenied = {
  ok: false
  message: string
}

export type NewsFeedRegionAccess = NewsFeedRegionAccessOk | NewsFeedRegionAccessDenied

/**
 * Restrict Hong Kong/Taiwan and international manifest rows to authenticated sessions.
 * Anonymous requests are limited to `cn` sources so the News overview cannot merge non-mainland pools by default.
 * @param authenticated Valid auth session (cookie)
 * @param requestedRegion Normalized `region` query: `''` when absent or invalid (invalid should be rejected earlier)
 * @returns Effective filter + cache key, or an error message for HTTP 403
 */
export function resolveNewsFeedRegionAccess(authenticated: boolean, requestedRegion: '' | NewsRegion): NewsFeedRegionAccess {
  if (!authenticated) {
    if (requestedRegion === 'hk_tw' || requestedRegion === 'intl') {
      return {
        ok: false,
        message: 'Hong Kong, Taiwan, and international news feeds require sign-in',
      }
    }
    return { ok: true, regionFilter: 'cn', regionCacheKey: 'cn' }
  }
  return {
    ok: true,
    regionFilter: requestedRegion === '' ? undefined : requestedRegion,
    regionCacheKey: requestedRegion,
  }
}

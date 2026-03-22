import { resolveNewsFeedRegionAccess } from '@/services/news/region/news-feed-region-access'

describe('resolveNewsFeedRegionAccess', () => {
  it('should force cn-only pool for anonymous users', () => {
    const r = resolveNewsFeedRegionAccess(false, '')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.regionFilter).toBe('cn')
      expect(r.regionCacheKey).toBe('cn')
    }
  })

  it('should reject hk_tw for anonymous users', () => {
    const r = resolveNewsFeedRegionAccess(false, 'hk_tw')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.message).toMatch(/sign-in/i)
    }
  })

  it('should reject intl for anonymous users', () => {
    const r = resolveNewsFeedRegionAccess(false, 'intl')
    expect(r.ok).toBe(false)
  })

  it('should allow all regions when authenticated and region query omitted', () => {
    const r = resolveNewsFeedRegionAccess(true, '')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.regionFilter).toBeUndefined()
      expect(r.regionCacheKey).toBe('')
    }
  })

  it('should pass through hk_tw when authenticated', () => {
    const r = resolveNewsFeedRegionAccess(true, 'hk_tw')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.regionFilter).toBe('hk_tw')
      expect(r.regionCacheKey).toBe('hk_tw')
    }
  })
})

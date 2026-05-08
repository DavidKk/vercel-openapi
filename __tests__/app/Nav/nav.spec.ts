import { getModuleSubPath } from '@/app/Nav/utils'

describe('getModuleSubPath', () => {
  describe('shared sub-paths (preserved when switching modules)', () => {
    it('should return /mcp when path is /china-fuel-price/mcp', () => {
      expect(getModuleSubPath('/china-fuel-price/mcp')).toBe('/mcp')
    })

    it('should return /function-calling when path is /dns/function-calling', () => {
      expect(getModuleSubPath('/dns/function-calling')).toBe('/function-calling')
    })

    it('should return /api when path is /china-holiday/api', () => {
      expect(getModuleSubPath('/china-holiday/api')).toBe('/api')
    })

    it('should return /skill when path is /china-weather/skill', () => {
      expect(getModuleSubPath('/china-weather/skill')).toBe('/skill')
    })

    it('should return full sub-path when path has more segments (e.g. /china-geo/mcp/extra)', () => {
      expect(getModuleSubPath('/china-geo/mcp/extra')).toBe('/mcp/extra')
    })
  })

  describe('module root (no sub-path)', () => {
    it('should return empty string when path is module root /china-holiday', () => {
      expect(getModuleSubPath('/china-holiday')).toBe('')
    })

    it('should return empty string when path is module root /china-geo', () => {
      expect(getModuleSubPath('/china-geo')).toBe('')
    })

    it('should return empty string when path is /', () => {
      expect(getModuleSubPath('/')).toBe('')
    })
  })

  describe('module-specific sub-paths (not preserved)', () => {
    it('should return empty string when path is /finance/stock/tasi', () => {
      expect(getModuleSubPath('/finance/stock/tasi')).toBe('')
    })

    it('should return empty string for unknown first segment sub-path (e.g. /finance/other)', () => {
      expect(getModuleSubPath('/finance/other')).toBe('')
    })
  })

  describe('non-module paths', () => {
    it('should return empty string when first segment is not a nav module', () => {
      expect(getModuleSubPath('/some/other/path')).toBe('')
    })

    it('should return empty string for null pathname', () => {
      expect(getModuleSubPath(null)).toBe('')
    })
  })
})

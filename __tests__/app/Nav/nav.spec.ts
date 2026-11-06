import { getModuleSubPath } from '@/app/Nav/utils'

describe('getModuleSubPath', () => {
  describe('shared sub-paths (preserved when switching modules)', () => {
    it('should return /mcp when path is /china-fuel-price/mcp', () => {
      expect(getModuleSubPath('/china-fuel-price/mcp')).toBe('/mcp')
    })

    it('should return empty string when path is a removed Function Calling route', () => {
      expect(getModuleSubPath('/dns/function-calling')).toBe('')
    })

    it('should return /api when path is /china-holiday/api', () => {
      expect(getModuleSubPath('/china-holiday/api')).toBe('/api')
    })

    it('should return empty string when path is a removed Skill route', () => {
      expect(getModuleSubPath('/dns/skill')).toBe('')
    })

    it('should return full sub-path when path has more segments (e.g. /dns/mcp/extra)', () => {
      expect(getModuleSubPath('/dns/mcp/extra')).toBe('/mcp/extra')
    })
  })

  describe('module root (no sub-path)', () => {
    it('should return empty string when path is module root /china-holiday', () => {
      expect(getModuleSubPath('/china-holiday')).toBe('')
    })

    it('should return empty string when path is module root /proxy-rule', () => {
      expect(getModuleSubPath('/proxy-rule')).toBe('')
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

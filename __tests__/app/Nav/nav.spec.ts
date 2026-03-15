import { getModuleSubPath } from '@/app/Nav/utils'

describe('getModuleSubPath', () => {
  describe('shared sub-paths (preserved when switching modules)', () => {
    it('should return /mcp when path is /fuel-price/mcp', () => {
      expect(getModuleSubPath('/fuel-price/mcp')).toBe('/mcp')
    })

    it('should return /function-calling when path is /dns/function-calling', () => {
      expect(getModuleSubPath('/dns/function-calling')).toBe('/function-calling')
    })

    it('should return /api when path is /holiday/api', () => {
      expect(getModuleSubPath('/holiday/api')).toBe('/api')
    })

    it('should return /skill when path is /weather/skill', () => {
      expect(getModuleSubPath('/weather/skill')).toBe('/skill')
    })

    it('should return full sub-path when path has more segments (e.g. /geo/mcp/extra)', () => {
      expect(getModuleSubPath('/geo/mcp/extra')).toBe('/mcp/extra')
    })
  })

  describe('module root (no sub-path)', () => {
    it('should return empty string when path is module root /holiday', () => {
      expect(getModuleSubPath('/holiday')).toBe('')
    })

    it('should return empty string when path is module root /geo', () => {
      expect(getModuleSubPath('/geo')).toBe('')
    })

    it('should return empty string when path is /', () => {
      expect(getModuleSubPath('/')).toBe('')
    })
  })

  describe('module-specific sub-paths (not preserved)', () => {
    it('should return empty string when path is /finance/tasi', () => {
      expect(getModuleSubPath('/finance/tasi')).toBe('')
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

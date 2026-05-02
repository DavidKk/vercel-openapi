import { parseEastmoneyDailySyncCategory, resolveMarketDailyCronSymbols } from '@/app/api/cron/sync/runMarketDailySync'

describe('runMarketDailySync helpers', () => {
  describe('parseEastmoneyDailySyncCategory', () => {
    it('should map omit and all to fund_and_precious', () => {
      expect(parseEastmoneyDailySyncCategory(null)).toBe('fund_and_precious')
      expect(parseEastmoneyDailySyncCategory('')).toBe('fund_and_precious')
      expect(parseEastmoneyDailySyncCategory('  ALL  ')).toBe('fund_and_precious')
    })

    it('should map fund and precious presets', () => {
      expect(parseEastmoneyDailySyncCategory('fund')).toBe('fund')
      expect(parseEastmoneyDailySyncCategory('PRECIOUS')).toBe('precious')
    })

    it('should return null for unknown category', () => {
      expect(parseEastmoneyDailySyncCategory('etf')).toBeNull()
    })
  })

  describe('resolveMarketDailyCronSymbols', () => {
    it('should prefer query over env over preset', () => {
      expect(resolveMarketDailyCronSymbols('111111', '222222', 'fund')).toEqual(['111111'])
      expect(resolveMarketDailyCronSymbols('', '222222', 'precious')).toEqual(['222222'])
    })
  })
})

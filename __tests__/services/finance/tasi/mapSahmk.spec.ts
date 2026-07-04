import { mapSahmkQuoteToCompany, mapSahmkSummaryToTasiSummary, parseSahmkDate } from '@/services/finance/tasi/mapSahmk'

describe('mapSahmk', () => {
  it('should map SAHMK market summary to TasiMarketSummary', () => {
    const summary = mapSahmkSummaryToTasiSummary({
      index: 'TASI',
      timestamp: '2026-07-02T12:20:00+00:00',
      index_value: 10826.98,
      index_change: -29.92,
      index_change_percent: -0.28,
      total_volume: 261825417,
      advancing: 96,
      declining: 153,
      unchanged: 21,
    })

    expect(summary).toMatchObject({
      date: '2026-07-02',
      close: 10826.98,
      change: -29.92,
      changePercent: -0.28,
      companiesTraded: 270,
      volumeTraded: 261825417,
      notes: 'mapped-from-sahmk',
    })
  })

  it('should map SAHMK quote to TasiCompanyDailyRecord', () => {
    const record = mapSahmkQuoteToCompany(
      {
        symbol: '2222',
        name_en: 'Saudi Arabian Oil Co',
        price: 26.1,
        change: -0.02,
        change_percent: -0.08,
        open: 26.1,
        high: 26.16,
        low: 26.08,
        previous_close: 26.12,
        volume: 7353282,
        value: 192003596.94,
        updated_at: '2026-07-02T15:19:48+00:00',
      },
      '2026-07-02'
    )

    expect(record).toMatchObject({
      code: '2222',
      name: 'Saudi Arabian Oil Co',
      lastPrice: 26.1,
      change: -0.02,
      changePercent: -0.08,
      open: 26.1,
      high: 26.16,
      low: 26.08,
      prevClose: 26.12,
      volume: 7353282,
      turnover: 192003596.94,
      date: '2026-07-02',
    })
  })

  it('should normalize SAHMK timestamps to YYYY-MM-DD', () => {
    expect(parseSahmkDate('2026-07-02T15:19:48+00:00')).toBe('2026-07-02')
    expect(parseSahmkDate('2026-07-02')).toBe('2026-07-02')
  })
})

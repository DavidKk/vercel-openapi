import { mapYahooChartJsonToStockSummary } from '@/services/finance/stock/upstreamIndexSummary'

describe('services/finance/stock upstreamIndexSummary', () => {
  it('should map Yahoo chart v8 JSON to summary with meta fields', () => {
    const body = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 100,
              chartPreviousClose: 80,
              regularMarketDayHigh: 101,
              regularMarketDayLow: 79,
              regularMarketVolume: 10,
              regularMarketTime: 1714521600,
              exchangeTimezoneName: 'America/New_York',
            },
            timestamp: [1714521600],
            indicators: { quote: [{ open: [81], high: [101], low: [79], close: [100], volume: [10] }] },
          },
        ],
        error: null,
      },
    }

    const s = mapYahooChartJsonToStockSummary('S&P 500', body)
    expect(s?.close).toBe(100)
    expect(s?.volumeTraded).toBe(10)
    expect(s?.changePercent).toBeCloseTo(25)
    expect(s?.valueTraded).toBe(1000)
    expect(s?.source).toBe('yahoo')
  })

  it('should return null when chart error is present', () => {
    const body = { chart: { error: { code: 'Not Found' }, result: [] } }
    expect(mapYahooChartJsonToStockSummary('VN Index', body)).toBeNull()
  })
})

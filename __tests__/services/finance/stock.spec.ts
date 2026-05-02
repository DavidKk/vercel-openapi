import { getStockSummary, getStockSummaryBatch, runStockSummaryIngest } from '@/services/finance/stock'
import { readLatestStockSummary, upsertStockSummaryDaily } from '@/services/finance/stock/turso'

jest.mock('@/services/finance/tasi', () => ({
  getSummaryDaily: jest.fn(),
}))

jest.mock('@/services/finance/stock/turso', () => ({
  readLatestStockSummary: jest.fn(),
  upsertStockSummaryDaily: jest.fn(),
}))

/** Minimal Yahoo chart v8 body used in tests */
function yahooChartBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    chart: {
      result: [
        {
          meta: {
            currency: 'USD',
            symbol: '^GSPC',
            regularMarketPrice: 7230.12,
            chartPreviousClose: 7165.08,
            regularMarketDayHigh: 7272.52,
            regularMarketDayLow: 7229.32,
            regularMarketVolume: 2918281000,
            regularMarketTime: 1714521600,
            exchangeTimezoneName: 'America/New_York',
            ...overrides,
          },
          timestamp: [1714521600],
          indicators: {
            quote: [
              {
                open: [7234.5],
                high: [7272.5],
                low: [7229.3],
                close: [7230.12],
                volume: [2918281000],
              },
            ],
          },
        },
      ],
      error: null,
    },
  }
}

describe('services/finance/stock', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    global.fetch = jest.fn()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('should read latest cached summary even when not today', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue({
      market: 'S&P 500',
      date: '2026-04-29',
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
      change: 0.1,
      changePercent: 0.2,
      volumeTraded: 100,
      valueTraded: 150,
      source: 'yahoo',
    })

    const summary = await getStockSummary('S&P 500')
    expect(summary?.market).toBe('S&P 500')
    expect(fetch).not.toHaveBeenCalled()
    expect(upsertStockSummaryDaily).not.toHaveBeenCalled()
  })

  it('should fetch Yahoo chart once and upsert on cold start for US index', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(yahooChartBody()),
    })

    const summary = await getStockSummary('S&P 500')
    expect(summary).toMatchObject({
      market: 'S&P 500',
      close: 7230.12,
      source: 'yahoo',
    })
    expect(summary?.changePercent).toBeCloseTo(((7230.12 - 7165.08) / 7165.08) * 100)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect((fetch as jest.Mock).mock.calls[0][0]).toContain('query1.finance.yahoo.com')
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(1)
  })

  it('should cold-start each market in batch like single getStockSummary', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(yahooChartBody()),
    })

    const items = await getStockSummaryBatch(['S&P 500', 'Dow Jones'])
    expect(items).toHaveLength(2)
    expect(items[0]?.market).toBe('S&P 500')
    expect(items[1]?.market).toBe('Dow Jones')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(2)
  })

  it('should dedupe concurrent cold-start refresh per market', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(yahooChartBody()),
    })

    const [a, b] = await Promise.all([getStockSummary('S&P 500'), getStockSummary('S&P 500')])
    expect(a?.close).toBe(7230.12)
    expect(b?.close).toBe(7230.12)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(1)
  })

  it('should prefer Eastmoney when secid is configured for a market', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          klines: ['2026-04-30,23715.71,24292.38,24293.11,23715.71,0,0.00,2.41,1.00,571.00,0.00'],
        },
      }),
    })

    const summary = await getStockSummary('DAX 30')
    expect(summary?.source).toBe('eastmoney-index')
    expect(summary?.close).toBe(24292.38)
    expect((fetch as jest.Mock).mock.calls[0][0]).toContain('push2his.eastmoney.com')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(1)
  })

  it('should refresh legacy fmp cache when close exists but chg/vol/value were null', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue({
      market: 'S&P 500',
      date: '2026-01-01',
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
      change: null,
      changePercent: null,
      volumeTraded: null,
      valueTraded: null,
      source: 'fmp',
    })
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(yahooChartBody({ regularMarketPrice: 5637, chartPreviousClose: 5600, regularMarketVolume: 999 })),
    })

    const summary = await getStockSummary('S&P 500')
    expect(fetch).toHaveBeenCalled()
    expect(summary?.volumeTraded).toBe(999)
    expect(summary?.source).toBe('yahoo')
    expect(upsertStockSummaryDaily).toHaveBeenCalled()
  })

  it('should run ingest and write all successful markets', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(yahooChartBody()),
    })

    const result = await runStockSummaryIngest(['S&P 500', 'Dow Jones'])
    expect(result).toEqual({ total: 2, success: 2, failed: 0 })
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(2)
  })
})

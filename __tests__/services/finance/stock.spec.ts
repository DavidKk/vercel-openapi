import { getStockSummary, getStockSummaryBatch, getStockSummaryDaily, runStockSummaryIngest } from '@/services/finance/stock'
import { readLatestStockSummary, readStockSummaryByDate, readStockSummaryRange, upsertStockSummaryDaily } from '@/services/finance/stock/turso'
import { getSummaryDaily } from '@/services/finance/tasi'

jest.mock('@/services/finance/tasi', () => ({
  getSummaryDaily: jest.fn(),
  getTodayUtc: jest.fn(() => '2026-05-01'),
  parseDate: jest.requireActual('@/services/finance/tasi').parseDate,
  TASI_MAX_RANGE_DAYS: 365,
}))

jest.mock('@/services/finance/stock/turso', () => ({
  readLatestStockSummary: jest.fn(),
  readStockSummaryByDate: jest.fn(),
  readStockSummaryRange: jest.fn(),
  upsertStockSummaryDaily: jest.fn(),
}))

describe('services/finance/stock', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      FMP_API_KEY: 'test-key',
      FMP_BASE_URL: 'https://example.test/stable',
    }
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
      source: 'fmp',
    })

    const summary = await getStockSummary('S&P 500')
    expect(summary?.market).toBe('S&P 500')
    expect(fetch).not.toHaveBeenCalled()
    expect(upsertStockSummaryDaily).not.toHaveBeenCalled()
  })

  it('should fetch once and upsert on cold start', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          open: 5600,
          dayHigh: 5650,
          dayLow: 5588,
          price: 5637,
          change: 25,
          changesPercentage: '0.45%',
          volume: 12345,
          timestamp: 1714521600,
        },
      ],
    })

    const summary = await getStockSummary('S&P 500')
    expect(summary).toMatchObject({
      market: 'S&P 500',
      open: 5600,
      high: 5650,
      low: 5588,
      close: 5637,
      change: 25,
      changePercent: 0.45,
      volumeTraded: 12345,
      valueTraded: 5637 * 12345,
      source: 'fmp',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(1)
  })

  it('should cold-start each market in batch like single getStockSummary', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          open: 5600,
          dayHigh: 5650,
          dayLow: 5588,
          price: 5637,
          change: 25,
          changesPercentage: '0.45%',
          volume: 12345,
          timestamp: 1714521600,
        },
      ],
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
    ;(fetch as jest.Mock).mockImplementation(
      async () =>
        ({
          ok: true,
          json: async () => [
            {
              open: 5600,
              dayHigh: 5650,
              dayLow: 5588,
              price: 5637,
              change: 25,
              changesPercentage: 0.45,
              volume: 12345,
              timestamp: 1714521600,
            },
          ],
        }) as Response
    )

    const [a, b] = await Promise.all([getStockSummary('S&P 500'), getStockSummary('S&P 500')])
    expect(a?.close).toBe(5637)
    expect(b?.close).toBe(5637)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(1)
  })

  it('should accept single-object FMP quote JSON (non-array)', async () => {
    ;(readLatestStockSummary as jest.Mock).mockResolvedValue(null)
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        price: 100,
        previousClose: 80,
        volume: 10,
        open: 81,
        dayHigh: 101,
        dayLow: 79,
        timestamp: 1714521600,
      }),
    })

    const summary = await getStockSummary('S&P 500')
    expect(summary?.close).toBe(100)
    expect(summary?.volumeTraded).toBe(10)
    expect(summary?.changePercent).toBeCloseTo(25)
    expect(summary?.valueTraded).toBe(1000)
  })

  it('should refresh fmp cache when close exists but chg/vol/value were null', async () => {
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
      json: async () => ({
        price: 5637,
        previous_close: 5600,
        volume: 999,
        open: 5600,
        day_high: 5650,
        day_low: 5588,
        timestamp: 1714521600,
      }),
    })

    const summary = await getStockSummary('S&P 500')
    expect(fetch).toHaveBeenCalled()
    expect(summary?.volumeTraded).toBe(999)
    expect(summary?.changePercent).toBeCloseTo(((5637 - 5600) / 5600) * 100)
    expect(upsertStockSummaryDaily).toHaveBeenCalled()
  })

  it('should run ingest and write all successful markets', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          open: 5600,
          dayHigh: 5650,
          dayLow: 5588,
          price: 5637,
          change: 25,
          changesPercentage: 0.45,
          volume: 12345,
          timestamp: 1714521600,
        },
      ],
    })

    const result = await runStockSummaryIngest(['S&P 500', 'Dow Jones'])
    expect(result).toEqual({ total: 2, success: 2, failed: 0 })
    expect(upsertStockSummaryDaily).toHaveBeenCalledTimes(2)
  })

  it('should return latest summary from getStockSummaryDaily when no date params', async () => {
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
      source: 'fmp',
    })

    const summary = await getStockSummaryDaily('S&P 500')
    expect(summary).toMatchObject({ market: 'S&P 500', close: 1.5 })
    expect(readStockSummaryByDate).not.toHaveBeenCalled()
  })

  it('should read historical summary by date for non-TASI markets', async () => {
    ;(readStockSummaryByDate as jest.Mock).mockResolvedValue({
      market: 'S&P 500',
      date: '2026-03-01',
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
      change: 0.1,
      changePercent: 0.2,
      volumeTraded: 100,
      valueTraded: 150,
      source: 'fmp',
    })

    const summary = await getStockSummaryDaily('S&P 500', { date: '2026-03-01' })
    expect(readStockSummaryByDate).toHaveBeenCalledWith('S&P 500', '2026-03-01')
    expect(summary).toMatchObject({ date: '2026-03-01' })
  })

  it('should read TASI historical summary by date via tasi feed', async () => {
    ;(getSummaryDaily as jest.Mock).mockResolvedValue({
      date: '2026-03-01',
      open: 12000,
      high: 12100,
      low: 11950,
      close: 12050,
      change: 50,
      changePercent: 0.42,
      volumeTraded: 100000000,
      valueTraded: 2500000000,
    })

    const summary = await getStockSummaryDaily('TASI', { date: '2026-03-01' })
    expect(getSummaryDaily).toHaveBeenCalledWith({ date: '2026-03-01' })
    expect(summary).toMatchObject({ market: 'TASI', source: 'tasi', date: '2026-03-01' })
  })

  it('should read summary range from Turso for non-TASI markets', async () => {
    ;(readStockSummaryRange as jest.Mock).mockResolvedValue([
      { market: 'Nasdaq', date: '2026-03-01', close: 1, source: 'fmp' },
      { market: 'Nasdaq', date: '2026-03-02', close: 2, source: 'fmp' },
    ])

    const items = await getStockSummaryDaily('Nasdaq', { from: '2026-03-01', to: '2026-03-31' })
    expect(readStockSummaryRange).toHaveBeenCalledWith('Nasdaq', '2026-03-01', '2026-03-31')
    expect(Array.isArray(items)).toBe(true)
    expect(items).toHaveLength(2)
  })
})

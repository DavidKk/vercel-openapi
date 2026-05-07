import { fetchDailyRangeFromEastmoney, fetchFundNavRangeFromEastmoney, parseEastmoneyFundNavLsjzItem } from '@/services/finance/market/daily/fetch'
import { getMarketDaily, getMarketDailyWithOptionalSync, parseSymbols, runMarketDailyIngestRange, toPublicOhlcvRecord } from '@/services/finance/market/daily/index'
import { readMarketDailyByRange, upsertMarketDailyRecords } from '@/services/finance/market/daily/turso'

jest.mock('@/services/finance/market/daily/fetch', () => ({
  fetchDailyRangeFromEastmoney: jest.fn(),
  fetchLatestDailyFromEastmoney: jest.fn(),
  fetchFundNavRangeFromEastmoney: jest.fn(),
  fetchLatestFundNavFromEastmoney: jest.fn(),
  parseEastmoneyFundNavLsjzItem: jest.requireActual('@/services/finance/market/daily/fetch').parseEastmoneyFundNavLsjzItem,
}))

jest.mock('@/services/finance/market/daily/turso', () => ({
  readMarketDailyByRange: jest.fn(),
  upsertMarketDailyRecords: jest.fn(),
}))

describe('services/finance/market/daily', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should always set macdUp and macdDown on public OHLCV rows (null when absent on internal row)', () => {
    const base = {
      date: '2025-01-01',
      symbol: '518880',
      open: 1,
      close: 2,
      high: 2,
      low: 1,
      volume: 1,
      amount: 1,
      amplitude: 0,
      changeRate: 0,
      changeAmount: 0,
      turnoverRate: 0,
      source: 'eastmoney' as const,
      isPlaceholder: false,
    }
    const without = toPublicOhlcvRecord({ ...base })
    expect(without).not.toBeNull()
    expect(without).toEqual(
      expect.objectContaining({
        macdUp: null,
        macdDown: null,
        ema12: null,
        ema26: null,
        dif: null,
        dea: null,
        macd: null,
      })
    )
    const withMacd = toPublicOhlcvRecord({
      ...base,
      macdUp: 2,
      macdDown: 1,
      macdEma12: 4,
      macdEma26: 3.9,
      macdDif: 0.1,
      macdDea: 0.08,
      macdHistogram: 0.04,
    })
    expect(withMacd).toEqual(
      expect.objectContaining({
        macdUp: 2,
        macdDown: 1,
        ema12: 4,
        ema26: 3.9,
        dif: 0.1,
        dea: 0.08,
        macd: 0.04,
      })
    )
  })

  it('should parse symbols as unique six-digit codes', () => {
    const symbols = parseSymbols('518880, 510300,abc,518880, 12345, 000001')
    expect(symbols).toEqual(['518880', '510300', '000001'])
  })

  it('should parse XAUUSD case-insensitively alongside six-digit codes', () => {
    const symbols = parseSymbols('518880, xauusd')
    expect(symbols).toEqual(['518880', 'XAUUSD'])
  })

  it('should map fund LSJZ row to daily record with NAV as close and changeRate', () => {
    const row = parseEastmoneyFundNavLsjzItem('012922', { FSRQ: '2024-12-31', DWJZ: '1.3460', JZZZL: '-1.15' })
    expect(row).toMatchObject({
      date: '2024-12-31',
      symbol: '012922',
      open: 1.346,
      high: 1.346,
      low: 1.346,
      close: 1.346,
      volume: 0,
      changeRate: -1.15,
      source: 'eastmoney-fund-nav',
    })
  })

  it('should treat empty fund daily return as zero changeRate', () => {
    const row = parseEastmoneyFundNavLsjzItem('012922', { FSRQ: '2022-01-11', DWJZ: '1.0000', JZZZL: '' })
    expect(row?.changeRate).toBe(0)
  })

  it('should add macdUp/macdDown on every row when withIndicators=true', async () => {
    ;(readMarketDailyByRange as jest.Mock).mockResolvedValue([
      {
        date: '2025-04-01',
        symbol: '518880',
        open: 5.1,
        close: 5.2,
        high: 5.3,
        low: 5.0,
        volume: 100,
        amount: 1000,
        amplitude: 1,
        changeRate: 0.1,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-02',
        symbol: '518880',
        open: 5.2,
        close: 5.25,
        high: 5.35,
        low: 5.1,
        volume: 120,
        amount: 1200,
        amplitude: 1,
        changeRate: 0.2,
        changeAmount: 0.02,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-03',
        symbol: '518880',
        open: 5.25,
        close: 5.3,
        high: 5.4,
        low: 5.2,
        volume: 130,
        amount: 1300,
        amplitude: 1,
        changeRate: 0.2,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
    ])

    const rows = await getMarketDaily({
      symbolsRaw: '518880',
      startDate: '2025-04-01',
      endDate: '2025-04-03',
      withIndicators: true,
    })

    expect(rows).toHaveLength(3)
    expect(typeof rows[0].macdUp).toBe('number')
    expect(typeof rows[0].macdDown).toBe('number')
    expect(typeof rows[2].macdUp).toBe('number')
    expect(typeof rows[2].macdDown).toBe('number')
  })

  it('should not use warmup by default for range indicators to preserve legacy service parity', async () => {
    ;(readMarketDailyByRange as jest.Mock).mockResolvedValue([
      {
        date: '2025-04-01',
        symbol: '518880',
        open: 5.1,
        close: 5.2,
        high: 5.3,
        low: 5.0,
        volume: 100,
        amount: 1000,
        amplitude: 1,
        changeRate: 0.1,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-02',
        symbol: '518880',
        open: 5.2,
        close: 5.25,
        high: 5.35,
        low: 5.1,
        volume: 120,
        amount: 1200,
        amplitude: 1,
        changeRate: 0.2,
        changeAmount: 0.02,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
    ])

    const rows = await getMarketDaily({
      symbolsRaw: '518880',
      startDate: '2025-04-01',
      endDate: '2025-04-02',
      withIndicators: true,
    })

    expect(readMarketDailyByRange).toHaveBeenCalledWith(['518880'], '2025-04-01', '2025-04-02')
    expect(rows).toHaveLength(2)
    expect(rows[0].macdEma12).toBe(5.2)
    expect(rows[0].macdEma26).toBe(5.2)
    expect(rows[0].macdHistogram).toBe(0)
  })

  it('should use 120-day warmup for indicators when indicatorWarmup=true but return only requested window', async () => {
    ;(readMarketDailyByRange as jest.Mock).mockResolvedValue([
      {
        date: '2024-12-02',
        symbol: '518880',
        open: 5.0,
        close: 5.1,
        high: 5.2,
        low: 4.9,
        volume: 90,
        amount: 900,
        amplitude: 1,
        changeRate: 0.1,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-01',
        symbol: '518880',
        open: 5.1,
        close: 5.2,
        high: 5.3,
        low: 5.0,
        volume: 100,
        amount: 1000,
        amplitude: 1,
        changeRate: 0.1,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-02',
        symbol: '518880',
        open: 5.2,
        close: 5.25,
        high: 5.35,
        low: 5.1,
        volume: 120,
        amount: 1200,
        amplitude: 1,
        changeRate: 0.2,
        changeAmount: 0.02,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
    ])

    const rows = await getMarketDaily({
      symbolsRaw: '518880',
      startDate: '2025-04-01',
      endDate: '2025-04-02',
      withIndicators: true,
      indicatorWarmup: true,
    })

    expect(readMarketDailyByRange).toHaveBeenCalledWith(['518880'], '2024-12-02', '2025-04-02')
    expect(rows).toHaveLength(2)
    expect(rows[0].date).toBe('2025-04-01')
    expect(rows[1].date).toBe('2025-04-02')
    expect(typeof rows[0].macdUp).toBe('number')
    expect(typeof rows[1].macdDown).toBe('number')
  })

  it('should use explicit indicatorWarmupDays when provided', async () => {
    ;(readMarketDailyByRange as jest.Mock).mockResolvedValue([
      {
        date: '2025-02-10',
        symbol: '518880',
        open: 5.0,
        close: 5.1,
        high: 5.2,
        low: 4.9,
        volume: 90,
        amount: 900,
        amplitude: 1,
        changeRate: 0.1,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-01',
        symbol: '518880',
        open: 5.1,
        close: 5.2,
        high: 5.3,
        low: 5.0,
        volume: 100,
        amount: 1000,
        amplitude: 1,
        changeRate: 0.1,
        changeAmount: 0.01,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
    ])

    const rows = await getMarketDaily({
      symbolsRaw: '518880',
      startDate: '2025-04-01',
      endDate: '2025-04-02',
      withIndicators: true,
      indicatorWarmupDays: 50,
    })

    expect(readMarketDailyByRange).toHaveBeenCalledWith(['518880'], '2025-02-10', '2025-04-02')
    expect(rows).toHaveLength(1)
    expect(rows[0].date).toBe('2025-04-01')
  })

  it('should refresh allowlisted cached rows when the requested window has a large gap', async () => {
    ;(readMarketDailyByRange as jest.Mock)
      .mockResolvedValueOnce([
        {
          date: '2025-12-31',
          symbol: '518880',
          open: 5.1,
          close: 5.2,
          high: 5.3,
          low: 5.0,
          volume: 100,
          amount: 1000,
          amplitude: 1,
          changeRate: 0.1,
          changeAmount: 0.01,
          turnoverRate: 1,
          source: 'eastmoney',
          isPlaceholder: false,
        },
        {
          date: '2026-04-30',
          symbol: '518880',
          open: 5.2,
          close: 5.25,
          high: 5.35,
          low: 5.1,
          volume: 120,
          amount: 1200,
          amplitude: 1,
          changeRate: 0.2,
          changeAmount: 0.02,
          turnoverRate: 1,
          source: 'eastmoney',
          isPlaceholder: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          date: '2026-01-05',
          symbol: '518880',
          open: 5.2,
          close: 5.25,
          high: 5.35,
          low: 5.1,
          volume: 120,
          amount: 1200,
          amplitude: 1,
          changeRate: 0.2,
          changeAmount: 0.02,
          turnoverRate: 1,
          source: 'eastmoney',
          isPlaceholder: false,
        },
      ])
    ;(fetchDailyRangeFromEastmoney as jest.Mock).mockResolvedValue([
      {
        date: '2026-01-05',
        symbol: '518880',
        open: 5.2,
        close: 5.25,
        high: 5.35,
        low: 5.1,
        volume: 120,
        amount: 1200,
        amplitude: 1,
        changeRate: 0.2,
        changeAmount: 0.02,
        turnoverRate: 1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
    ])

    const result = await getMarketDailyWithOptionalSync({
      symbolsRaw: '518880',
      startDate: '2025-12-31',
      endDate: '2026-04-30',
      syncIfEmpty: true,
      allowOnDemandIngest: true,
    })

    expect(fetchDailyRangeFromEastmoney).toHaveBeenCalledWith('518880', { endDate: '20260430', limit: 151 })
    expect(result.synced).toBe(true)
    expect(result.items).toHaveLength(1)
  })

  it('should backfill by date range and only write rows in range', async () => {
    ;(fetchDailyRangeFromEastmoney as jest.Mock).mockResolvedValue([
      {
        date: '2025-03-31',
        symbol: '518880',
        open: 5,
        close: 5,
        high: 5,
        low: 5,
        volume: 1,
        amount: 1,
        amplitude: 0,
        changeRate: 0,
        changeAmount: 0,
        turnoverRate: 0,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-01',
        symbol: '518880',
        open: 5,
        close: 5.1,
        high: 5.2,
        low: 4.9,
        volume: 10,
        amount: 100,
        amplitude: 1,
        changeRate: 1,
        changeAmount: 0.1,
        turnoverRate: 0.1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
      {
        date: '2025-04-02',
        symbol: '518880',
        open: 5.1,
        close: 5.2,
        high: 5.3,
        low: 5.0,
        volume: 10,
        amount: 110,
        amplitude: 1,
        changeRate: 1,
        changeAmount: 0.1,
        turnoverRate: 0.1,
        source: 'eastmoney',
        isPlaceholder: false,
      },
    ])

    const result = await runMarketDailyIngestRange({
      symbols: ['518880'],
      startDate: '2025-04-01',
      endDate: '2025-04-02',
    })

    expect(result).toEqual({ total: 1, written: 2 })
    expect(upsertMarketDailyRecords).toHaveBeenCalledTimes(1)
    const writtenRows = (upsertMarketDailyRecords as jest.Mock).mock.calls[0][0]
    expect(writtenRows).toHaveLength(2)
    expect(writtenRows[0].date).toBe('2025-04-01')
    expect(writtenRows[1].date).toBe('2025-04-02')
  })

  it('should backfill fund NAV symbols via fetchFundNavRangeFromEastmoney', async () => {
    ;(fetchFundNavRangeFromEastmoney as jest.Mock).mockResolvedValue([
      {
        date: '2025-04-01',
        symbol: '012922',
        open: 1.1,
        close: 1.1,
        high: 1.1,
        low: 1.1,
        volume: 0,
        amount: 0,
        amplitude: 0,
        changeRate: 0.5,
        changeAmount: 0,
        turnoverRate: 0,
        source: 'eastmoney-fund-nav',
        isPlaceholder: false,
      },
    ])
    ;(fetchDailyRangeFromEastmoney as jest.Mock).mockResolvedValue([])

    const result = await runMarketDailyIngestRange({
      symbols: ['012922'],
      startDate: '2025-04-01',
      endDate: '2025-04-02',
    })

    expect(result).toEqual({ total: 1, written: 1 })
    expect(fetchFundNavRangeFromEastmoney).toHaveBeenCalledWith('012922', {
      startDate: '2025-04-01',
      endDate: '2025-04-02',
    })
    expect(fetchDailyRangeFromEastmoney).not.toHaveBeenCalled()
  })
})

import { fetchDailyRangeFromEastmoney, fetchFundNavRangeFromEastmoney, parseEastmoneyFundNavLsjzItem } from '@/services/finance/market/daily/fetch'
import { getMarketDaily, parseSymbols, runMarketDailyIngestRange } from '@/services/finance/market/daily/index'
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

  it('should parse symbols as unique six-digit codes', () => {
    const symbols = parseSymbols('518880, 510300,abc,518880, 12345, 000001')
    expect(symbols).toEqual(['518880', '510300', '000001'])
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

  it('should add macdUp/macdDown only on latest row per symbol when withIndicators=true', async () => {
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
    expect(rows[0].macdUp).toBeNull()
    expect(rows[0].macdDown).toBeNull()
    expect(typeof rows[2].macdUp).toBe('number')
    expect(typeof rows[2].macdDown).toBe('number')
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

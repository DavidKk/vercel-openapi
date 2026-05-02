import { attachMacdIndicators } from '@/services/finance/market/daily'
import type { FinanceMarketDailyRecord } from '@/services/finance/market/daily/types'
import { buildOverviewStockListEntries } from '@/services/finance/overview/stockList'

function baseRow(partial: Partial<FinanceMarketDailyRecord> & Pick<FinanceMarketDailyRecord, 'date' | 'close'>): FinanceMarketDailyRecord {
  return {
    symbol: '518880',
    open: partial.open ?? partial.close,
    high: partial.high ?? partial.close,
    low: partial.low ?? partial.close,
    close: partial.close,
    volume: partial.volume ?? 0,
    amount: partial.amount ?? 0,
    amplitude: partial.amplitude ?? 0,
    changeRate: partial.changeRate ?? 0,
    changeAmount: partial.changeAmount ?? 0,
    turnoverRate: partial.turnoverRate ?? 0,
    source: partial.source ?? 'eastmoney',
    isPlaceholder: partial.isPlaceholder ?? false,
    date: partial.date,
  }
}

describe('services/finance/overview/stockList', () => {
  it('should map latest bar to stockList row with macd streak after enrichment', () => {
    const raw: FinanceMarketDailyRecord[] = [baseRow({ date: '2025-04-01', close: 5.2 }), baseRow({ date: '2025-04-02', close: 5.25 }), baseRow({ date: '2025-04-03', close: 5.3 })]
    const enriched = attachMacdIndicators(raw)
    const list = buildOverviewStockListEntries(['518880'], enriched, '2025-04-03')
    expect(list).toHaveLength(1)
    expect(list[0].stockCode).toBe('518880')
    expect(list[0].date).toBe('2025-04-03')
    expect(list[0].price).toBe(5.3)
    expect(typeof list[0].macdUp).toBe('number')
    expect(typeof list[0].macdDown).toBe('number')
  })
})

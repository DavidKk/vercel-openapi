import { buildEastmoneySecid, EASTMONEY_XAUUSD_SECID, fetchDailyRangeFromEastmoney, resolveEastmoneySecidForKline } from '@/services/finance/market/daily/fetch'

describe('services/finance/market/daily eastmoney secid', () => {
  it('should map XAUUSD to Eastmoney unified spot gold secid', () => {
    expect(resolveEastmoneySecidForKline('XAUUSD')).toBe(EASTMONEY_XAUUSD_SECID)
  })

  it('should keep six-digit SH/SZ secid rules for non-precious symbols', () => {
    expect(resolveEastmoneySecidForKline('518880')).toBe(buildEastmoneySecid('518880'))
  })

  it('should call Eastmoney kline with secid=122.XAU when symbol is XAUUSD', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = jest.fn().mockImplementation(
      () =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: { klines: [] } }),
        }) as Promise<Response>
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    try {
      await fetchDailyRangeFromEastmoney('XAUUSD', { limit: 1 })
    } finally {
      globalThis.fetch = originalFetch
    }
    expect(fetchMock).toHaveBeenCalled()
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '')
    expect(url).toContain('secid=122.XAU')
    expect(url).not.toContain('secid=0.XAUUSD')
  })
})

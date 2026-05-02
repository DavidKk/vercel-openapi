'use client'

interface QuoteSummary {
  symbol: 'xauusd'
  date: string
  high: string
  low: string
  latest: string
}

const MOCK_SUMMARY: QuoteSummary = {
  symbol: 'xauusd',
  date: '2025-05-19',
  high: '3249.8300',
  low: '3201.7800',
  latest: '3229.2750',
}

/**
 * Gold overview: summary-only layout for xauusd (static demo numbers until a live feed is wired).
 * Lower panel is intentionally empty for future extension.
 */
export function QuoteLiteOverview() {
  const summary = MOCK_SUMMARY

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800">xauusd</span>
          <span
            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-900"
            title="Figures are placeholder demo data, not live quotes"
          >
            Demo / mock
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200 p-4">
        <div className="rounded border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">{summary.symbol} summary (demo)</span>
            <span className="text-xs text-gray-500">{summary.date}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded bg-white p-2">
              <div className="text-xs text-gray-500">High</div>
              <div className="font-semibold text-gray-900">{summary.high}</div>
            </div>
            <div className="rounded bg-white p-2">
              <div className="text-xs text-gray-500">Low</div>
              <div className="font-semibold text-gray-900">{summary.low}</div>
            </div>
            <div className="rounded bg-white p-2">
              <div className="text-xs text-gray-500">Latest</div>
              <div className="font-semibold text-gray-900">{summary.latest}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="text-sm text-gray-400">Reserved for future content.</p>
      </div>
    </section>
  )
}

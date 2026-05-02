'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import type { FinanceMarketOhlcvDailyRecord } from '@/services/finance/market/daily/types'
import { formatNumber, formatPercent } from '@/utils/formatNumber'

const PRECIOUS_SYMBOL = 'XAUUSD'
const RANGE_DAYS = 90

interface MarketDailyEnvelope {
  code?: number
  message?: string
  data?: { items?: FinanceMarketOhlcvDailyRecord[]; synced?: boolean }
}

/**
 * Format a Date as YYYY-MM-DD in local calendar.
 *
 * @param d Date instance
 * @returns ISO-like date string without time
 */
function formatLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Build [startDate, endDate] for the last {@link RANGE_DAYS} calendar days ending today (local).
 *
 * @returns Tuple of inclusive start and end dates
 */
function rollingLocalRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - RANGE_DAYS)
  return { startDate: formatLocalYmd(start), endDate: formatLocalYmd(end) }
}

/**
 * Tailwind text color for daily change percent (positive / negative / flat).
 *
 * @param value Change rate in percent
 * @returns Text color class
 */
function chgPercentClass(value: number): string {
  if (!Number.isFinite(value)) return 'text-gray-800'
  if (value > 0) return 'text-emerald-700'
  if (value < 0) return 'text-red-700'
  return 'text-gray-800'
}

function ohlcvRowsHaveLiquidity(rows: FinanceMarketOhlcvDailyRecord[]): boolean {
  return rows.some((r) => r.volume > 0 || r.amount > 0)
}

const thBase = 'border-b border-gray-200 px-2 py-2.5 font-medium text-gray-700'
const thDate = `sticky left-0 z-20 bg-gray-100 ${thBase} whitespace-nowrap text-left`
const tdDate = 'sticky left-0 z-10 bg-white px-2 py-1.5 font-mono font-semibold whitespace-nowrap text-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-gray-50'

/**
 * Precious metals spot overview: loads `/api/finance/market/daily` for **XAUUSD** with
 * **`syncIfEmpty=true`** so an empty Turso window triggers one server-side Eastmoney range
 * ingest (cold start), then the same summary + table shell as fund OHLCV.
 *
 * @returns Full-height section with header, summary strip, and descending daily table
 */
export function QuoteLiteOverview() {
  const [rows, setRows] = useState<FinanceMarketOhlcvDailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { startDate, endDate } = rollingLocalRange()
    const q = new URLSearchParams({
      symbols: PRECIOUS_SYMBOL,
      startDate,
      endDate,
    })
    /** One request: read Turso, then ingest from Eastmoney when the range is empty (same as fund allowlisted sync). */
    q.set('syncIfEmpty', 'true')
    setLoading(true)
    setError(null)
    setRows([])
    try {
      const baseUrl = `/api/finance/market/daily?${q.toString()}`
      const res = await fetch(baseUrl, { cache: 'no-store' })
      const body = (await res.json()) as MarketDailyEnvelope
      if (!res.ok || (typeof body.code === 'number' && body.code !== 0)) {
        setError(body.message ?? `HTTP ${res.status}`)
        return
      }
      const list = body.data?.items ?? []
      const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      setRows(sorted)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const latest = rows[0] ?? null
  const rowCount = rows.length
  const showLiquidity = useMemo(() => ohlcvRowsHaveLiquidity(rows), [rows])

  if (error) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center bg-white p-4">
        <p className="max-w-md text-center text-sm text-red-600">{error}</p>
        <p className="mt-2 max-w-md text-center text-xs text-gray-500">
          Check Turso env and network; you can still run <code className="rounded bg-gray-100 px-1">GET /api/cron/sync/finance-market-sync?symbols=XAUUSD</code> manually.
        </p>
      </section>
    )
  }

  if (loading && rowCount === 0) {
    return (
      <section className="flex min-h-0 flex-1 flex-col bg-white">
        <div className={`shrink-0 ${CONTENT_HEADER_CLASS}`}>
          <span className="min-w-0 truncate text-base font-semibold text-gray-700">Gold / USD</span>
          <span className="shrink-0 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-600">XAUUSD</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-400">Loading…</div>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className={`shrink-0 ${CONTENT_HEADER_CLASS} overflow-visible`}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="min-w-0 truncate text-base font-semibold text-gray-700">Gold / USD</span>
            <span
              className="shrink-0 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-600"
              title="ISO-style pair ticker; stored under symbol XAUUSD"
            >
              XAUUSD
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex flex-col gap-3 text-base text-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Summary</span>
                {latest ? <span className="text-sm tabular-nums text-gray-500">As of {latest.date}</span> : <span className="text-sm text-gray-400">No data</span>}
              </div>
              {latest ? (
                <div className={`grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 ${showLiquidity ? 'lg:grid-cols-7' : 'lg:grid-cols-5'}`}>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Open</span>
                    <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latest.open)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">High</span>
                    <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latest.high)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Low</span>
                    <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latest.low)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Close</span>
                    <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latest.close)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Chg%</span>
                    <span className={`tabular-nums font-semibold ${chgPercentClass(latest.changeRate)}`}>{formatPercent(latest.changeRate)}</span>
                  </div>
                  {showLiquidity ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Vol</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latest.volume, { maxFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latest.amount)}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No rows for this window after a cold-start sync. Configure Turso, confirm Eastmoney is reachable, or run{' '}
                  <code className="rounded bg-gray-200 px-1 text-[11px]">GET /api/cron/sync/finance-market-sync?symbols=XAUUSD</code>.
                </p>
              )}
            </div>
          </div>

          {rowCount === 0 && !loading ? (
            <div className="flex min-h-[8rem] flex-1 items-center justify-center p-8" role="status" aria-live="polite">
              <p className="text-sm text-gray-400">No rows.</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm text-gray-800" role="grid" aria-label="XAUUSD daily history">
              <caption className="sr-only">Daily history for the last {RANGE_DAYS} calendar days</caption>
              <thead className="sticky top-0 z-20 bg-gray-100">
                <tr className="shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                  <th scope="col" className={thDate}>
                    Date
                  </th>
                  <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                    Open
                  </th>
                  <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                    High
                  </th>
                  <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                    Low
                  </th>
                  <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                    Close
                  </th>
                  <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                    % Change
                  </th>
                  {showLiquidity ? (
                    <>
                      <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                        Volume traded
                      </th>
                      <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                        Amount
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date} className="group border-b border-gray-100 hover:bg-gray-50">
                    <td className={tdDate}>{row.date}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-gray-800">{formatNumber(row.open)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-gray-800">{formatNumber(row.high)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-gray-800">{formatNumber(row.low)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap text-gray-900">{formatNumber(row.close)}</td>
                    <td className={`px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap ${chgPercentClass(row.changeRate)}`}>{formatPercent(row.changeRate)}</td>
                    {showLiquidity ? (
                      <>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap text-gray-800">{formatNumber(row.volume, { maxFractionDigits: 0 })}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-gray-800">{formatNumber(row.amount)}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  )
}

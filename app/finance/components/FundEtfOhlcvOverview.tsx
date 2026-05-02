'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import { useDebugPanel } from '@/components/DebugPanel'
import type { FinanceFundNavDailyRecord, FinanceMarketOhlcvDailyRecord } from '@/services/finance/market/daily/types'
import { formatNumber, formatPercent } from '@/utils/formatNumber'

import { type FundEtfOhlcvSymbol, isFundNavCatalogSymbol } from '../constants/fundEtfOhlcv'
import { FundEtfOhlcvOverviewSkeleton } from './FundEtfOhlcvOverviewSkeleton'

/** Rolling window length (calendar days) for market/daily requests */
const RANGE_DAYS = 90

interface MarketOhlcvEnvelope {
  code?: number
  data?: { items?: FinanceMarketOhlcvDailyRecord[]; synced?: boolean }
  message?: string
}

interface FundNavEnvelope {
  code?: number
  data?: { items?: FinanceFundNavDailyRecord[]; synced?: boolean }
  message?: string
}

interface FundEtfOhlcvOverviewProps {
  /** Six-digit symbol from the route */
  symbol: FundEtfOhlcvSymbol
  /** Optional header control (e.g. symbol dropdown), same row as stock overview */
  headerAddon?: ReactNode
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
 * True when any OHLCV row has non-zero volume or amount.
 *
 * @param rows Exchange daily records
 * @returns Whether to show volume and amount columns
 */
function ohlcvRowsHaveLiquidity(rows: FinanceMarketOhlcvDailyRecord[]): boolean {
  return rows.some((r) => r.volume > 0 || r.amount > 0)
}

/** Table header cell classes aligned with the finance stock (TASI) company table. */
const thBase = 'border-b border-gray-200 px-2 py-2.5 font-medium text-gray-700'

/** Date column: sticky first column; `whitespace-nowrap` keeps ISO dates on one line (auto table layout). */
const thDate = `sticky left-0 z-20 bg-gray-100 ${thBase} whitespace-nowrap text-left`
const tdDate = 'sticky left-0 z-10 bg-white px-2 py-1.5 font-mono font-semibold whitespace-nowrap text-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-gray-50'

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

/**
 * Fund/ETF overview: loads `/api/finance/market/daily` (exchange OHLCV) or `/api/finance/fund/nav/daily` (fund NAV) by symbol.
 * MACD fields stay on `GET /api/finance/overview/stock-list` for API consumers only (not shown here).
 * UI copy is English; product titles in the header come from {@link formatFundEtfTitle} (may include Chinese names).
 * In development, registers the global debug panel (`useDebugPanel`): force loading shows a skeleton; force error shows a
 * full-page message (same pattern as stock loaders).
 *
 * @param props Symbol and optional header slot
 * @returns Overview section with latest summary and history table
 */
export function FundEtfOhlcvOverview({ symbol, headerAddon }: FundEtfOhlcvOverviewProps) {
  const [ohlcvRows, setOhlcvRows] = useState<FinanceMarketOhlcvDailyRecord[]>([])
  const [navRows, setNavRows] = useState<FinanceFundNavDailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (sym: string) => {
    const { startDate, endDate } = rollingLocalRange()
    const q = new URLSearchParams({
      symbols: sym,
      startDate,
      endDate,
    })
    setLoading(true)
    setError(null)
    setOhlcvRows([])
    setNavRows([])
    const navMode = isFundNavCatalogSymbol(sym)
    try {
      const path = navMode ? '/api/finance/fund/nav/daily' : '/api/finance/market/daily'
      const baseUrl = `${path}?${q.toString()}`
      const res = await fetch(baseUrl, { cache: 'no-store' })
      const body = (await res.json()) as MarketOhlcvEnvelope | FundNavEnvelope
      if (!res.ok || (typeof body.code === 'number' && body.code !== 0)) {
        setError(body.message ?? `HTTP ${res.status}`)
        return
      }
      if (navMode) {
        let list = (body as FundNavEnvelope).data?.items ?? []
        if (list.length === 0) {
          const resSync = await fetch(`${baseUrl}&syncIfEmpty=true`, { cache: 'no-store' })
          const bodySync = (await resSync.json()) as FundNavEnvelope
          if (resSync.ok && (typeof bodySync.code !== 'number' || bodySync.code === 0)) {
            list = bodySync.data?.items ?? []
          }
        }
        const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        setNavRows(sorted)
      } else {
        let list = (body as MarketOhlcvEnvelope).data?.items ?? []
        if (list.length === 0) {
          const resSync = await fetch(`${baseUrl}&syncIfEmpty=true`, { cache: 'no-store' })
          const bodySync = (await resSync.json()) as MarketOhlcvEnvelope
          if (resSync.ok && (typeof bodySync.code !== 'number' || bodySync.code === 0)) {
            list = bodySync.data?.items ?? []
          }
        }
        const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        setOhlcvRows(sorted)
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(symbol)
  }, [load, symbol])

  const isNavMode = isFundNavCatalogSymbol(symbol)
  const latestNav = navRows[0] ?? null
  const latestOhlcv = ohlcvRows[0] ?? null
  const rowCount = isNavMode ? navRows.length : ohlcvRows.length
  const showLiquidity = useMemo(() => ohlcvRowsHaveLiquidity(ohlcvRows), [ohlcvRows])

  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null
  const displayError = forceError != null ? (debug?.errorMessage ?? forceError) : error

  if (displayError) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center p-4">
        <p className="text-base text-red-600">{displayError}</p>
      </section>
    )
  }

  if (forceLoading || (loading && rowCount === 0)) {
    return <FundEtfOhlcvOverviewSkeleton headerAddon={headerAddon} ariaLabel="Loading fund data" />
  }

  const latestDate = isNavMode ? latestNav?.date : latestOhlcv?.date
  const hasLatest = isNavMode ? latestNav != null : latestOhlcv != null

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className={`shrink-0 ${CONTENT_HEADER_CLASS} overflow-visible`}>{headerAddon ?? null}</div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex flex-col gap-3 text-base text-gray-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">{isNavMode ? 'Latest NAV' : 'Latest session'}</span>
                {latestDate ? <span className="text-sm tabular-nums text-gray-500">As of {latestDate}</span> : <span className="text-sm text-gray-400">No data</span>}
              </div>
              {hasLatest ? (
                <>
                  {isNavMode && latestNav ? (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Unit NAV</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestNav.unitNav)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Daily chg%</span>
                        <span className={`tabular-nums font-semibold ${chgPercentClass(latestNav.dailyChangePercent)}`}>{formatPercent(latestNav.dailyChangePercent)}</span>
                      </div>
                    </div>
                  ) : null}
                  {!isNavMode && latestOhlcv ? (
                    <div className={`grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 ${showLiquidity ? 'lg:grid-cols-7' : 'lg:grid-cols-5'}`}>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Open</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestOhlcv.open)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">High</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestOhlcv.high)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Low</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestOhlcv.low)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Close</span>
                        <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestOhlcv.close)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Chg%</span>
                        <span className={`tabular-nums font-semibold ${chgPercentClass(latestOhlcv.changeRate)}`}>{formatPercent(latestOhlcv.changeRate)}</span>
                      </div>
                      {showLiquidity ? (
                        <>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Vol</span>
                            <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestOhlcv.volume, { maxFractionDigits: 0 })}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount</span>
                            <span className="tabular-nums font-semibold text-gray-900">{formatNumber(latestOhlcv.amount)}</span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  No rows for this window. Configure Turso and run <code className="rounded bg-gray-200 px-1 text-[11px]">GET /api/cron/sync/finance-market-sync</code>, or rely on
                  auto backfill for allowlisted symbols.
                </p>
              )}
            </div>
          </div>

          {rowCount === 0 && !loading ? (
            <div className="flex min-h-[8rem] flex-1 items-center justify-center p-8" role="status" aria-live="polite">
              <p className="text-sm text-gray-400">No rows.</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm text-gray-800" role="grid" aria-label="Fund or ETF daily history">
              <caption className="sr-only">Daily history for the last {RANGE_DAYS} calendar days</caption>
              <thead className="sticky top-0 z-20 bg-gray-100">
                <tr className="shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                  {isNavMode ? (
                    <>
                      <th scope="col" className={thDate}>
                        Date
                      </th>
                      <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                        Unit NAV
                      </th>
                      <th scope="col" className={`${thBase} text-right whitespace-nowrap`}>
                        % Change
                      </th>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isNavMode
                  ? navRows.map((row) => (
                      <tr key={row.date} className="group border-b border-gray-100 hover:bg-gray-50">
                        <td className={tdDate}>{row.date}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{formatNumber(row.unitNav)}</td>
                        <td className={`px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap ${chgPercentClass(row.dailyChangePercent)}`}>
                          {formatPercent(row.dailyChangePercent)}
                        </td>
                      </tr>
                    ))
                  : ohlcvRows.map((row) => (
                      <tr key={row.date} className="group border-b border-gray-100 hover:bg-gray-50">
                        <td className={tdDate}>{row.date}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.open)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.high)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.low)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{formatNumber(row.close)}</td>
                        <td className={`px-2 py-1.5 text-right tabular-nums font-semibold whitespace-nowrap ${chgPercentClass(row.changeRate)}`}>
                          {formatPercent(row.changeRate)}
                        </td>
                        {showLiquidity ? (
                          <>
                            <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-800 whitespace-nowrap">
                              {formatNumber(row.volume, { maxFractionDigits: 0 })}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.amount)}</td>
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

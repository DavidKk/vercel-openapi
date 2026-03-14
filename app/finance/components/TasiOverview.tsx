'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TbArrowDown, TbArrowsSort, TbArrowUp, TbSearch } from 'react-icons/tb'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from '@/services/finance/tasi'
import { writeCompanyDailyToIdb, writeSummaryToIdb } from '@/services/finance/tasi/browser'
import { formatNumber, formatPercent } from '@/utils/formatNumber'

export interface TasiOverviewProps {
  /** Latest day's company daily records (from finance feed; currently TASI). Null when fetch failed or not configured. */
  company: TasiCompanyDailyRecord[] | null
  /** Latest day's market summary. Null when fetch failed or not configured. */
  summary: TasiMarketSummary | null
  /** Error message when fetch failed. */
  error?: string | null
}

type SortKey = 'code' | 'name' | 'open' | 'high' | 'low' | 'lastPrice' | 'changePercent' | 'volume' | 'turnover' | 'numberOfTrades' | 'marketCap'
type SortDirection = 'ascending' | 'descending' | 'none'

/**
 * Return CSS class for change-percent: positive green, negative red, zero/empty neutral.
 * @param value Change percent number or null
 * @returns Tailwind text color class
 */
function chgPercentClass(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'text-gray-800'
  if (value > 0) return 'text-emerald-700'
  if (value < 0) return 'text-red-700'
  return 'text-gray-800'
}

function numOrNull(row: TasiCompanyDailyRecord, key: SortKey): number | null {
  const v = row[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function strOrEmpty(row: TasiCompanyDailyRecord, key: 'code' | 'name'): string {
  const v = row[key]
  return v != null ? String(v) : ''
}

/**
 * Finance overview: table of latest day's company daily data and market summary (currently TASI).
 * Data is supplied by parent (e.g. TasiOverviewLoader: IDB-first then API); sort and search are client-side.
 */
const AUTOCOMPLETE_MAX = 10

export function TasiOverview({ company, summary, error }: TasiOverviewProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)

  /** Persist to IndexedDB when we have data (store what we can; especially latest snapshot). */
  useEffect(() => {
    if (company && company.length > 0 && summary?.date) {
      writeCompanyDailyToIdb(summary.date, company).catch(() => {})
      writeSummaryToIdb(summary.date, summary).catch(() => {})
    }
  }, [company, summary])

  if (error) {
    return (
      <section className="flex flex-col p-4">
        <p className="text-base text-red-600">{error}</p>
      </section>
    )
  }

  const rows = company ?? []
  const hasData = rows.length > 0 || summary != null

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter((row) => {
      const code = strOrEmpty(row, 'code').toLowerCase()
      const name = strOrEmpty(row, 'name').toLowerCase()
      return code.includes(q) || name.includes(q)
    })
  }, [rows, searchQuery])

  const suggestionList = useMemo(() => filteredRows.slice(0, AUTOCOMPLETE_MAX), [filteredRows])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const sortedRows = useMemo(() => {
    if (!sortConfig || sortConfig.direction === 'none') return filteredRows
    const key = sortConfig.key
    const isNum = key !== 'code' && key !== 'name'
    return [...filteredRows].sort((a, b) => {
      if (isNum) {
        const av = numOrNull(a, key as Exclude<SortKey, 'code' | 'name'>)
        const bv = numOrNull(b, key as Exclude<SortKey, 'code' | 'name'>)
        const aVal = av ?? -Infinity
        const bVal = bv ?? -Infinity
        const out = aVal - bVal
        return sortConfig.direction === 'ascending' ? out : -out
      }
      const aStr = strOrEmpty(a, key)
      const bStr = strOrEmpty(b, key)
      const out = aStr.localeCompare(bStr, undefined, { sensitivity: 'base' })
      return sortConfig.direction === 'ascending' ? out : -out
    })
  }, [filteredRows, sortConfig])

  function requestSort(key: SortKey) {
    let direction: SortDirection = 'ascending'
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'ascending') direction = 'descending'
      else if (sortConfig.direction === 'descending') direction = 'none'
    }
    setSortConfig({ key, direction })
  }

  const iconClass = 'ml-0.5 inline h-4 w-4 shrink-0'
  function getSortIndicator(key: SortKey): React.ReactNode {
    const active = sortConfig?.key === key
    const dir = active ? sortConfig.direction : 'none'
    if (dir === 'ascending') return <TbArrowUp className={`${iconClass} text-gray-500`} aria-hidden />
    if (dir === 'descending') return <TbArrowDown className={`${iconClass} text-gray-500`} aria-hidden />
    return <TbArrowsSort className={`${iconClass} text-gray-400`} aria-hidden />
  }

  const thSortableClass = 'cursor-pointer hover:bg-gray-200 select-none'
  const thBase = 'border-b border-gray-200 px-2 py-2.5 font-medium text-gray-700'

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {!hasData && <p className="p-4 text-sm text-gray-500">No data. Configure TASI_FEED_URL (finance feed) and ensure the feed returns the latest day’s data.</p>}

      {hasData && (
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          {rows.length > 0 && (
            <div className={`shrink-0 ${CONTENT_HEADER_CLASS} gap-2`}>
              <span className="text-base font-semibold text-gray-700">Tasi</span>
              <div ref={searchWrapRef} className="relative ml-auto">
                <div className="relative">
                  <TbSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search by code or name…"
                    className="w-56 rounded border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
                    aria-label="Search by code or name"
                    aria-autocomplete="list"
                    aria-expanded={showSuggestions && suggestionList.length > 0}
                    aria-controls="tasi-search-listbox"
                    aria-activedescendant={undefined}
                  />
                  {showSuggestions && searchQuery.trim() && (
                    <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                      <ul id="tasi-search-listbox" role="listbox" className="max-h-56 overflow-auto">
                        {suggestionList.length === 0 ? (
                          <li className="px-3 py-2.5 text-sm text-gray-500">No matches</li>
                        ) : (
                          suggestionList.map((row) => (
                            <li key={row.code}>
                              <button
                                type="button"
                                role="option"
                                className="w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-100"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  setSearchQuery(row.code)
                                  setShowSuggestions(false)
                                }}
                              >
                                <span className="font-mono font-medium">{row.code}</span>
                                {row.name ? <span className="ml-2 text-gray-500">{row.name}</span> : null}
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-auto">
            {searchQuery.trim() && sortedRows.length === 0 ? (
              <div className="flex min-h-full min-w-full flex-1 items-center justify-center p-8" role="status" aria-live="polite">
                <p className="text-sm text-gray-500">No matching content.</p>
              </div>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left text-sm" role="grid" aria-label="Finance company daily (TASI)">
                <caption className="sr-only">Latest trading day company prices and volume</caption>
                <thead className="sticky top-0 z-20 bg-gray-100">
                  {summary != null && (
                    <tr className="bg-gray-50">
                      <th colSpan={11} scope="row" className="bg-gray-50 px-4 py-3 text-left font-normal">
                        <div className="flex flex-col gap-3 text-base text-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">Market summary</span>
                            <span className="text-sm tabular-nums text-gray-500">{summary.date ?? '–'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 lg:grid-cols-7">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Open (SAR)</span>
                              <span className="tabular-nums font-semibold text-gray-900">{formatNumber(summary.open)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">High (SAR)</span>
                              <span className="tabular-nums font-semibold text-gray-900">{formatNumber(summary.high)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Low (SAR)</span>
                              <span className="tabular-nums font-semibold text-gray-900">{formatNumber(summary.low)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Close (SAR)</span>
                              <span className="tabular-nums font-semibold text-gray-900">{formatNumber(summary.close)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Chg%</span>
                              <span className={`tabular-nums font-semibold ${chgPercentClass(summary.changePercent)}`}>{formatPercent(summary.changePercent)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Vol</span>
                              <span className="tabular-nums font-semibold text-gray-900">{formatNumber(summary.volumeTraded, { maxFractionDigits: 0 })}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Value Traded (SAR)</span>
                              <span className="tabular-nums font-semibold text-gray-900">{formatNumber(summary.valueTraded)}</span>
                            </div>
                          </div>
                        </div>
                      </th>
                    </tr>
                  )}
                  <tr className="shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                    <th scope="col" className={`sticky left-0 z-20 bg-gray-100 ${thBase} ${thSortableClass}`} onClick={() => requestSort('code')}>
                      <div className="flex items-center">Symbol{getSortIndicator('code')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-left`} onClick={() => requestSort('name')}>
                      <div className="flex items-center">Company{getSortIndicator('name')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('open')}>
                      <div className="flex items-center justify-end">Open (SAR){getSortIndicator('open')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('high')}>
                      <div className="flex items-center justify-end">High (SAR){getSortIndicator('high')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('low')}>
                      <div className="flex items-center justify-end">Low (SAR){getSortIndicator('low')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('lastPrice')}>
                      <div className="flex items-center justify-end">Close (SAR){getSortIndicator('lastPrice')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('changePercent')}>
                      <div className="flex items-center justify-end">% Change{getSortIndicator('changePercent')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('volume')}>
                      <div className="flex items-center justify-end">Volume Traded{getSortIndicator('volume')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('turnover')}>
                      <div className="flex items-center justify-end">Value Traded (SAR){getSortIndicator('turnover')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('numberOfTrades')}>
                      <div className="flex items-center justify-end">No. of Trades{getSortIndicator('numberOfTrades')}</div>
                    </th>
                    <th scope="col" className={`${thBase} ${thSortableClass} text-right whitespace-nowrap`} onClick={() => requestSort('marketCap')}>
                      <div className="flex items-center justify-end">Market Cap (SAR){getSortIndicator('marketCap')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, i) => (
                    <tr key={row.code || `row-${i}`} className="group border-b border-gray-100 hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-2 py-1.5 font-mono font-semibold text-gray-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-gray-50">
                        {row.code || '–'}
                      </td>
                      <td className="max-w-[12rem] truncate px-2 py-1.5 text-gray-900" title={row.name ?? undefined}>
                        {row.name || '–'}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.open)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.high)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.low)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">{formatNumber(row.lastPrice)}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums whitespace-nowrap font-semibold ${chgPercentClass(row.changePercent)}`}>
                        {formatPercent(row.changePercent)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-800 whitespace-nowrap">{formatNumber(row.volume, { maxFractionDigits: 0 })}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.turnover)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.numberOfTrades, { maxFractionDigits: 0 })}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-800 whitespace-nowrap">{formatNumber(row.marketCap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

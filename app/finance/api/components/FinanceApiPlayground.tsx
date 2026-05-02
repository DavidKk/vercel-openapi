'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import type { RequestExampleInput } from '@/utils/requestExamples'

type Endpoint = 'company' | 'summary' | 'summaryHourly' | 'stockSummary' | 'stockSummaryBatch' | 'marketDaily' | 'fundNavDaily' | 'overviewStockList'

interface FinanceApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  endpoint: Endpoint
  date: string
  code: string
  from: string
  to: string
  stockMarket: string
  stockMarkets: string
  mdSymbols: string
  mdStart: string
  mdEnd: string
  mdWithIndicators: boolean
  mdSyncIfEmpty: boolean
  ovSymbols: string
  ovStart: string
  ovEnd: string
  ovSyncIfEmpty: boolean
}

/**
 * Interactive GET playground for Finance REST routes (TASI market scopes, stock summary, six-digit exchange OHLCV vs fund NAV daily).
 */
export function FinanceApiPlayground() {
  const [state, setState] = useState<FinanceApiState>({
    loading: false,
    endpoint: 'company',
    date: '',
    code: '',
    from: '',
    to: '',
    stockMarket: 'TASI',
    stockMarkets: 'TASI,S&P 500,Dow Jones',
    mdSymbols: '518880',
    mdStart: '',
    mdEnd: '',
    mdWithIndicators: false,
    mdSyncIfEmpty: true,
    ovSymbols: '518880',
    ovStart: '',
    ovEnd: '',
    ovSyncIfEmpty: true,
  })

  const [examplesOpen, setExamplesOpen] = useState(false)

  function pathForEndpoint(endpoint: Endpoint): string {
    if (endpoint === 'company') return '/api/finance/stock/tasi/company/daily'
    if (endpoint === 'summary') return '/api/finance/stock/tasi/summary/daily'
    if (endpoint === 'summaryHourly') return '/api/finance/stock/tasi/summary/hourly'
    if (endpoint === 'marketDaily') return '/api/finance/fund/…/ohlcv/daily'
    if (endpoint === 'fundNavDaily') return '/api/finance/fund/…/nav/daily'
    if (endpoint === 'overviewStockList') return '/api/finance/overview/stock-list'
    return '/api/finance/stock/summary'
  }

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const baseCompany = '/api/finance/stock/tasi/company/daily'
    const baseSummary = '/api/finance/stock/tasi/summary/daily'
    const baseSummaryHourly = '/api/finance/stock/tasi/summary/hourly'
    const baseStock = '/api/finance/stock/summary'
    const baseOverviewStockList = '/api/finance/overview/stock-list'

    let url: string
    if (state.endpoint === 'company') {
      const q = new URLSearchParams()
      if (state.code && state.from && state.to) {
        q.set('code', state.code)
        q.set('from', state.from)
        q.set('to', state.to)
        url = `${baseCompany}?${q.toString()}`
      } else if (state.date) {
        q.set('date', state.date)
        url = `${baseCompany}?${q.toString()}`
      } else {
        url = baseCompany
      }
    } else if (state.endpoint === 'summary') {
      const q = new URLSearchParams()
      if (state.from && state.to) {
        q.set('from', state.from)
        q.set('to', state.to)
        url = `${baseSummary}?${q.toString()}`
      } else if (state.date) {
        q.set('date', state.date)
        url = `${baseSummary}?${q.toString()}`
      } else {
        url = baseSummary
      }
    } else if (state.endpoint === 'summaryHourly') {
      url = baseSummaryHourly
    } else if (state.endpoint === 'stockSummaryBatch') {
      const q = new URLSearchParams()
      q.set('markets', state.stockMarkets)
      url = `${baseStock}?${q.toString()}`
    } else if (state.endpoint === 'marketDaily') {
      const sym = state.mdSymbols.split(',')[0]?.trim() || '518880'
      const q = new URLSearchParams()
      q.set('startDate', state.mdStart)
      q.set('endDate', state.mdEnd)
      if (state.mdWithIndicators) q.set('withIndicators', 'true')
      if (state.mdSyncIfEmpty) q.set('syncIfEmpty', 'true')
      url = `/api/finance/fund/${encodeURIComponent(sym)}/ohlcv/daily?${q.toString()}`
    } else if (state.endpoint === 'fundNavDaily') {
      const sym = state.mdSymbols.split(',')[0]?.trim() || '012922'
      const q = new URLSearchParams()
      q.set('startDate', state.mdStart)
      q.set('endDate', state.mdEnd)
      if (state.mdSyncIfEmpty) q.set('syncIfEmpty', 'true')
      url = `/api/finance/fund/${encodeURIComponent(sym)}/nav/daily?${q.toString()}`
    } else if (state.endpoint === 'overviewStockList') {
      const q = new URLSearchParams()
      q.set('symbols', state.ovSymbols)
      q.set('startDate', state.ovStart)
      q.set('endDate', state.ovEnd)
      if (state.ovSyncIfEmpty) q.set('syncIfEmpty', 'true')
      url = `${baseOverviewStockList}?${q.toString()}`
    } else {
      const q = new URLSearchParams()
      q.set('market', state.stockMarket)
      url = `${baseStock}?${q.toString()}`
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
      const durationMs = performance.now() - startedAt
      const text = await response.text()
      setState((prev) => ({
        ...prev,
        loading: false,
        status: response.status,
        durationMs,
        error: undefined,
        responseBody: text,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setState((prev) => ({
        ...prev,
        loading: false,
        status: undefined,
        durationMs: undefined,
        error: message,
        responseBody: undefined,
      }))
    }
  }

  const {
    loading,
    status,
    durationMs,
    error,
    responseBody,
    endpoint,
    date,
    code,
    from,
    to,
    stockMarket,
    stockMarkets,
    mdSymbols,
    mdStart,
    mdEnd,
    mdWithIndicators,
    mdSyncIfEmpty,
    ovSymbols,
    ovStart,
    ovEnd,
    ovSyncIfEmpty,
  } = state
  const path = pathForEndpoint(endpoint)

  const requestExamples: RequestExampleInput = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    let url: string
    if (endpoint === 'company') {
      const q = new URLSearchParams()
      if (code && from && to) {
        q.set('code', code)
        q.set('from', from)
        q.set('to', to)
        url = `${path}?${q.toString()}`
      } else if (date) {
        q.set('date', date)
        url = `${path}?${q.toString()}`
      } else {
        url = path
      }
    } else if (endpoint === 'summary') {
      const q = new URLSearchParams()
      if (from && to) {
        q.set('from', from)
        q.set('to', to)
        url = `${path}?${q.toString()}`
      } else if (date) {
        q.set('date', date)
        url = `${path}?${q.toString()}`
      } else {
        url = path
      }
    } else if (endpoint === 'summaryHourly') {
      url = path
    } else if (endpoint === 'stockSummaryBatch') {
      const q = new URLSearchParams()
      q.set('markets', stockMarkets)
      url = `${path}?${q.toString()}`
    } else if (endpoint === 'marketDaily') {
      const sym = mdSymbols.split(',')[0]?.trim() || '518880'
      const q = new URLSearchParams()
      q.set('startDate', mdStart)
      q.set('endDate', mdEnd)
      if (mdWithIndicators) q.set('withIndicators', 'true')
      if (mdSyncIfEmpty) q.set('syncIfEmpty', 'true')
      url = `/api/finance/fund/${encodeURIComponent(sym)}/ohlcv/daily?${q.toString()}`
    } else if (endpoint === 'fundNavDaily') {
      const sym = mdSymbols.split(',')[0]?.trim() || '012922'
      const q = new URLSearchParams()
      q.set('startDate', mdStart)
      q.set('endDate', mdEnd)
      if (mdSyncIfEmpty) q.set('syncIfEmpty', 'true')
      url = `/api/finance/fund/${encodeURIComponent(sym)}/nav/daily?${q.toString()}`
    } else if (endpoint === 'overviewStockList') {
      const q = new URLSearchParams()
      q.set('symbols', ovSymbols)
      q.set('startDate', ovStart)
      q.set('endDate', ovEnd)
      if (ovSyncIfEmpty) q.set('syncIfEmpty', 'true')
      url = `${path}?${q.toString()}`
    } else {
      const q = new URLSearchParams()
      q.set('market', stockMarket)
      url = `${path}?${q.toString()}`
    }

    return {
      method: 'GET',
      url: `${origin}${url}`,
      headers: { Accept: 'application/json' },
    }
  })()

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />
      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 flex-col gap-1 border-b border-gray-100 px-3 py-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">Request</span>
              <span className={PLAYGROUND_HEADER_BADGE_CLASS}>GET {path}</span>
            </div>
            <p className="text-[10px] text-gray-500">Finance REST demo — same paths as documented on the left.</p>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span>Endpoint</span>
              <FormSelect
                value={endpoint}
                onChange={(v) => setState((prev) => ({ ...prev, endpoint: v as Endpoint }))}
                options={[
                  { value: 'company', label: 'TASI — Company daily' },
                  { value: 'summary', label: 'TASI — Summary daily' },
                  { value: 'summaryHourly', label: 'TASI — Summary hourly' },
                  { value: 'stockSummary', label: 'Stock summary — single market' },
                  { value: 'stockSummaryBatch', label: 'Stock summary — batch (markets=)' },
                  { value: 'marketDaily', label: 'Six-digit — Exchange daily OHLCV' },
                  { value: 'fundNavDaily', label: 'Six-digit — Fund NAV daily (LSJZ)' },
                  { value: 'overviewStockList', label: 'Overview — stockList + MACD (latest per symbol)' },
                ]}
              />
            </label>
            {endpoint !== 'summaryHourly' &&
              endpoint !== 'stockSummary' &&
              endpoint !== 'stockSummaryBatch' &&
              endpoint !== 'marketDaily' &&
              endpoint !== 'fundNavDaily' &&
              endpoint !== 'overviewStockList' && (
                <label className="flex flex-col gap-1">
                  <span>date (optional, YYYY-MM-DD)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={date}
                    onChange={(e) => setState((prev) => ({ ...prev, date: e.target.value }))}
                    placeholder="e.g. 2025-03-01"
                  />
                </label>
              )}
            {endpoint === 'company' && (
              <>
                <label className="flex flex-col gap-1">
                  <span>code (K-line, with from+to)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={code}
                    onChange={(e) => setState((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. 1120"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>from (K-line)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={from}
                    onChange={(e) => setState((prev) => ({ ...prev, from: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>to (K-line)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={to}
                    onChange={(e) => setState((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              </>
            )}
            {endpoint === 'summary' && (
              <>
                <label className="flex flex-col gap-1">
                  <span>from (K-line)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={from}
                    onChange={(e) => setState((prev) => ({ ...prev, from: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>to (K-line)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={to}
                    onChange={(e) => setState((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
              </>
            )}
            {endpoint === 'summaryHourly' && <p className="text-[10px] text-gray-500">Hourly TASI buckets for alignment checks.</p>}
            {endpoint === 'stockSummary' && (
              <label className="flex flex-col gap-1">
                <span>market</span>
                <input
                  type="text"
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={stockMarket}
                  onChange={(e) => setState((prev) => ({ ...prev, stockMarket: e.target.value }))}
                  placeholder="e.g. TASI, Nasdaq, S&P 500"
                />
              </label>
            )}
            {endpoint === 'stockSummaryBatch' && (
              <label className="flex flex-col gap-1">
                <span>markets (comma-separated)</span>
                <input
                  type="text"
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                  value={stockMarkets}
                  onChange={(e) => setState((prev) => ({ ...prev, stockMarkets: e.target.value }))}
                  placeholder="TASI,S&P 500,Dow Jones"
                />
              </label>
            )}
            {endpoint === 'overviewStockList' && (
              <>
                <label className="flex flex-col gap-1">
                  <span>symbols</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={ovSymbols}
                    onChange={(e) => setState((prev) => ({ ...prev, ovSymbols: e.target.value }))}
                    placeholder="518880 or 518880,510300"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>startDate</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={ovStart}
                    onChange={(e) => setState((prev) => ({ ...prev, ovStart: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>endDate</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={ovEnd}
                    onChange={(e) => setState((prev) => ({ ...prev, ovEnd: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={ovSyncIfEmpty} onChange={(e) => setState((prev) => ({ ...prev, ovSyncIfEmpty: e.target.checked }))} />
                  <span>syncIfEmpty</span>
                </label>
              </>
            )}
            {(endpoint === 'marketDaily' || endpoint === 'fundNavDaily') && (
              <>
                <label className="flex flex-col gap-1">
                  <span>symbols (comma-separated six-digit)</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={mdSymbols}
                    onChange={(e) => setState((prev) => ({ ...prev, mdSymbols: e.target.value }))}
                    placeholder={endpoint === 'fundNavDaily' ? '012922,016665' : '518880,510300'}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>startDate</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={mdStart}
                    onChange={(e) => setState((prev) => ({ ...prev, mdStart: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span>endDate</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm"
                    value={mdEnd}
                    onChange={(e) => setState((prev) => ({ ...prev, mdEnd: e.target.value }))}
                    placeholder="YYYY-MM-DD"
                  />
                </label>
                {endpoint === 'marketDaily' ? (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={mdWithIndicators} onChange={(e) => setState((prev) => ({ ...prev, mdWithIndicators: e.target.checked }))} />
                    <span>withIndicators</span>
                  </label>
                ) : null}
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={mdSyncIfEmpty} onChange={(e) => setState((prev) => ({ ...prev, mdSyncIfEmpty: e.target.checked }))} />
                  <span>syncIfEmpty (allowlisted symbols only)</span>
                </label>
              </>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send request'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setExamplesOpen(true)}
                aria-label="Request examples"
                title="Request examples"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <TbCode className="h-3 w-3" />
                </span>
              </button>
              {durationMs != null && <span className="text-[10px] text-gray-500">{durationMs.toFixed(0)} ms</span>}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status != null && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono">HTTP {status}</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2 text-[10px] leading-relaxed text-gray-800">
            {error ? <pre className="text-red-600">{error}</pre> : responseBody ? <JsonViewer value={responseBody} /> : <span className="text-gray-500">No response yet.</span>}
          </div>
        </div>
      </form>
      <RequestExamplesPopup open={examplesOpen} onClose={() => setExamplesOpen(false)} request={requestExamples} defaultTab="curl" />
    </div>
  )
}

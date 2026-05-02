'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import type { RequestExampleInput } from '@/utils/requestExamples'

type Endpoint = 'company' | 'summary' | 'summaryHourly' | 'stockSummaryTasi'

interface TasiApiState {
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
}

/**
 * TASI-only demo playground for Finance market and stock GET APIs (no multi-market picker).
 */
export function TasiApiPlayground() {
  const [state, setState] = useState<TasiApiState>({
    loading: false,
    endpoint: 'company',
    date: '',
    code: '',
    from: '',
    to: '',
  })

  const [examplesOpen, setExamplesOpen] = useState(false)

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const baseCompany = '/api/finance/market/company/daily'
    const baseSummary = '/api/finance/market/summary/daily'
    const baseSummaryHourly = '/api/finance/market/summary/hourly'
    const baseStockSummaryTasi = '/api/finance/stock/summary'

    let url: string
    if (state.endpoint === 'company') {
      const q = new URLSearchParams()
      q.set('market', 'TASI')
      if (state.code && state.from && state.to) {
        q.set('code', state.code)
        q.set('from', state.from)
        q.set('to', state.to)
        url = `${baseCompany}?${q.toString()}`
      } else if (state.date) {
        q.set('date', state.date)
        url = `${baseCompany}?${q.toString()}`
      } else {
        url = `${baseCompany}?market=TASI`
      }
    } else if (state.endpoint === 'summary') {
      const q = new URLSearchParams()
      q.set('market', 'TASI')
      if (state.from && state.to) {
        q.set('from', state.from)
        q.set('to', state.to)
        url = `${baseSummary}?${q.toString()}`
      } else if (state.date) {
        q.set('date', state.date)
        url = `${baseSummary}?${q.toString()}`
      } else {
        url = `${baseSummary}?market=TASI`
      }
    } else if (state.endpoint === 'summaryHourly') {
      url = `${baseSummaryHourly}?market=TASI`
    } else {
      url = `${baseStockSummaryTasi}?market=TASI`
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

  const { loading, status, durationMs, error, responseBody, endpoint, date, code, from, to } = state
  const path =
    endpoint === 'company'
      ? '/api/finance/market/company/daily'
      : endpoint === 'summary'
        ? '/api/finance/market/summary/daily'
        : endpoint === 'summaryHourly'
          ? '/api/finance/market/summary/hourly'
          : '/api/finance/stock/summary'

  const requestExamples: RequestExampleInput = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    let url: string
    if (endpoint === 'company') {
      const q = new URLSearchParams()
      q.set('market', 'TASI')
      if (code && from && to) {
        q.set('code', code)
        q.set('from', from)
        q.set('to', to)
        url = `${path}?${q.toString()}`
      } else if (date) {
        q.set('date', date)
        url = `${path}?${q.toString()}`
      } else {
        url = `${path}?market=TASI`
      }
    } else if (endpoint === 'summary') {
      const q = new URLSearchParams()
      q.set('market', 'TASI')
      if (from && to) {
        q.set('from', from)
        q.set('to', to)
        url = `${path}?${q.toString()}`
      } else if (date) {
        q.set('date', date)
        url = `${path}?${q.toString()}`
      } else {
        url = `${path}?market=TASI`
      }
    } else if (endpoint === 'summaryHourly') {
      url = `${path}?market=TASI`
    } else {
      url = `${path}?market=TASI`
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
            <p className="text-[10px] text-gray-500">TASI-only demo — no multi-market picker.</p>
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
                  { value: 'summaryHourly', label: 'TASI — Summary hourly (alignment)' },
                  { value: 'stockSummaryTasi', label: 'TASI — Stock summary' },
                ]}
              />
            </label>
            {endpoint !== 'summaryHourly' && endpoint !== 'stockSummaryTasi' && (
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
            {endpoint === 'summaryHourly' && <p className="text-[10px] text-gray-500">Hourly TASI buckets for alignment checks against daily summary fields.</p>}
            {endpoint === 'stockSummaryTasi' && <p className="text-[10px] text-gray-500">Fixed GET with market=TASI (no batch or extra params).</p>}
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

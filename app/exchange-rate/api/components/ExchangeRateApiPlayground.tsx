'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import { getExchangeRateFromIdb, setExchangeRateInIdb } from '@/services/freecurrencyapi/browser'
import type { RequestExampleInput } from '@/utils/requestExamples'

type ExchangeRateMethod = 'GET' | 'POST'

interface ExchangeRateApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  method: ExchangeRateMethod
  base: string
  from: string
  to: string
  amount: string
}

/**
 * Playground for GET (rates) and POST (convert) /api/exchange-rate.
 */
export function ExchangeRateApiPlayground() {
  const [state, setState] = useState<ExchangeRateApiState>({
    loading: false,
    method: 'GET',
    base: 'USD',
    from: 'USD',
    to: 'CNY',
    amount: '100',
  })

  const [examplesOpen, setExamplesOpen] = useState(false)

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (state.method === 'GET') {
      const url = `/api/exchange-rate?base=${encodeURIComponent(state.base)}`
      try {
        setState((prev) => ({ ...prev, loading: true, error: undefined }))
        const startedAt = performance.now()
        const fromIdb = await getExchangeRateFromIdb(state.base)
        if (fromIdb) {
          const durationMs = performance.now() - startedAt
          const text = JSON.stringify({ code: 0, message: 'ok', data: fromIdb }, null, 2)
          setState((prev) => ({ ...prev, loading: false, status: 200, durationMs, error: undefined, responseBody: text }))
          return
        }
        const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
        const durationMs = performance.now() - startedAt
        const text = await response.text()
        const body = JSON.parse(text) as { code: number; message: string; data?: ExchangeRateData }
        if (response.ok && body.data) await setExchangeRateInIdb(state.base, body.data)
        setState((prev) => ({
          ...prev,
          loading: false,
          status: response.status,
          durationMs,
          error: undefined,
          responseBody: text,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setState((prev) => ({
          ...prev,
          loading: false,
          status: undefined,
          durationMs: undefined,
          error: message,
          responseBody: undefined,
        }))
      }
      return
    }

    const amountNum = parseFloat(state.amount)
    if (Number.isNaN(amountNum)) {
      setState((prev) => ({ ...prev, error: 'Invalid amount' }))
      return
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch('/api/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          from: state.from,
          to: state.to,
          amount: amountNum,
        }),
      })
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
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

  const { loading, status, durationMs, error, responseBody, method, base, from, to, amount } = state

  const requestExamples: RequestExampleInput | null = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    if (method === 'GET') {
      const headers: Record<string, string> = { Accept: 'application/json' }
      return {
        method,
        url: `${origin}/api/exchange-rate?base=${encodeURIComponent(base)}`,
        headers,
      }
    }

    const amountNum = parseFloat(amount)
    if (Number.isNaN(amountNum)) return null

    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' }
    return {
      method,
      url: `${origin}/api/exchange-rate`,
      headers,
      body: JSON.stringify({ from, to, amount: amountNum }),
    }
  })()

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>{method} /api/exchange-rate</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Method</span>
              <FormSelect
                value={method}
                onChange={(v) => setState((prev) => ({ ...prev, method: v as ExchangeRateMethod }))}
                options={[
                  { value: 'GET', label: 'GET – Get rates for base currency' },
                  { value: 'POST', label: 'POST – Convert amount' },
                ]}
              />
            </label>
            {method === 'GET' && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">base</span>
                <input
                  type="text"
                  className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  value={base}
                  onChange={(e) => setState((prev) => ({ ...prev, base: e.target.value }))}
                  placeholder="USD"
                />
              </label>
            )}
            {method === 'POST' && (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">from</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    value={from}
                    onChange={(e) => setState((prev) => ({ ...prev, from: e.target.value }))}
                    placeholder="USD"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">to</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    value={to}
                    onChange={(e) => setState((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="CNY"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">amount</span>
                  <input
                    type="text"
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    value={amount}
                    onChange={(e) => setState((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="100"
                  />
                </label>
              </>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send request'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setExamplesOpen(true)}
                disabled={!requestExamples}
                aria-label="Request examples"
                title="Request examples"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <TbCode className="h-3 w-3" />
                </span>
              </button>
              {durationMs !== undefined && <span className="text-[10px] text-gray-500">{durationMs.toFixed(0)} ms</span>}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status !== undefined && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">HTTP {status}</span>}
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-white p-2 text-[10px] leading-relaxed text-gray-800">
            {error ? <pre className="text-red-600">{error}</pre> : responseBody ? <JsonViewer value={responseBody} /> : <span className="text-gray-500">No response yet.</span>}
          </div>
        </div>
      </form>
      <RequestExamplesPopup open={examplesOpen} onClose={() => setExamplesOpen(false)} request={requestExamples} defaultTab="curl" />
    </div>
  )
}

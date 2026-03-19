'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { FormSelect } from '@/components/FormSelect'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import type { RequestExampleInput } from '@/utils/requestExamples'

type PricesApiEndpoint = 'list' | 'search' | 'calc'

const PRICES_API_ENDPOINTS: Record<PricesApiEndpoint, { method: 'GET' | 'POST'; path: '/api/prices/products' | '/api/prices/products/search' | '/api/prices/calc' }> = {
  list: { method: 'GET', path: '/api/prices/products' },
  search: { method: 'GET', path: '/api/prices/products/search' },
  calc: { method: 'POST', path: '/api/prices/calc' },
}

interface PricesApiState {
  loading: boolean
  endpoint: PricesApiEndpoint
  query: string
  bodyText: string
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
}

/**
 * Playground for prices-related routes and auth session API.
 * @returns Prices API playground
 */
export function PricesApiPlayground() {
  const [state, setState] = useState<PricesApiState>({
    loading: false,
    endpoint: 'list',
    query: 'cola',
    bodyText: JSON.stringify(
      {
        productName: 'cola',
        totalPrice: 12.5,
        totalQuantity: 1.5,
        quantityUnit: 'L',
      },
      null,
      2
    ),
  })

  const [examplesOpen, setExamplesOpen] = useState(false)

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const selected = PRICES_API_ENDPOINTS[state.endpoint]

      const url = state.endpoint === 'search' && state.query.trim() ? `/api/prices/products/search?q=${encodeURIComponent(state.query.trim())}` : selected.path

      const requestInit: RequestInit = {
        method: selected.method,
        headers: { Accept: 'application/json, text/html;q=0.9,*/*;q=0.8' },
      }
      if (selected.method === 'POST') {
        requestInit.headers = {
          ...requestInit.headers,
          'Content-Type': 'application/json',
        }
        requestInit.body = state.bodyText
      }

      const response = await fetch(url, requestInit)
      const durationMs = performance.now() - startedAt
      const text = await response.text()

      setState((prev) => ({
        ...prev,
        loading: false,
        status: response.status,
        durationMs,
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

  const { loading, endpoint, query, bodyText, status, durationMs, error, responseBody } = state
  const selected = PRICES_API_ENDPOINTS[endpoint]

  const requestExamples: RequestExampleInput | null = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = endpoint === 'search' && query.trim() ? `${origin}/api/prices/products/search?q=${encodeURIComponent(query.trim())}` : `${origin}${selected.path}`

    const headers: Record<string, string> = { Accept: 'application/json, text/html;q=0.9,*/*;q=0.8' }
    if (selected.method === 'POST') {
      headers['Content-Type'] = 'application/json'
      return { method: selected.method, url, headers, body: bodyText }
    }
    return { method: selected.method, url, headers }
  })()

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />
      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>
              {selected.method} {selected.path}
            </span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Endpoint</span>
              <FormSelect
                value={endpoint}
                onChange={(value) => setState((prev) => ({ ...prev, endpoint: value as PricesApiEndpoint }))}
                options={[
                  { value: 'list', label: 'GET /api/prices/products - list products' },
                  { value: 'search', label: 'GET /api/prices/products/search - search products' },
                  { value: 'calc', label: 'POST /api/prices/calc - calculate comparisons' },
                ]}
              />
            </label>
            {endpoint === 'search' ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">q</span>
                <input
                  type="text"
                  className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  value={query}
                  onChange={(event) => setState((prev) => ({ ...prev, query: event.target.value }))}
                  placeholder="cola"
                />
              </label>
            ) : null}
            {endpoint === 'calc' ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">Body (JSON)</span>
                <textarea
                  className="h-28 resize-none rounded border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-900"
                  spellCheck={false}
                  value={bodyText}
                  onChange={(event) => setState((prev) => ({ ...prev, bodyText: event.target.value }))}
                />
              </label>
            ) : null}
            <div className="inline-flex items-center gap-2 rounded-md p-0.5">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send request'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setExamplesOpen(true)}
                disabled={!requestExamples}
                aria-label="Request examples"
                title="Request examples"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <TbCode className="h-3 w-3" />
                </span>
              </button>
              {durationMs !== undefined ? <span className="text-[10px] text-gray-500">{durationMs.toFixed(0)} ms</span> : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status !== undefined ? <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700">HTTP {status}</span> : null}
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

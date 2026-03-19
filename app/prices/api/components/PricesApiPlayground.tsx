'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MdOutlineAdminPanelSettings } from 'react-icons/md'
import { TbChevronDown, TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import { Tooltip } from '@/components/Tooltip'
import type { RequestExampleInput } from '@/utils/requestExamples'

type PricesApiEndpoint = 'list' | 'search' | 'calc' | 'create' | 'update' | 'delete'

const PRICES_API_ENDPOINTS: Record<
  PricesApiEndpoint,
  {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: '/api/prices/products' | '/api/prices/calc'
    needsQuery?: 'q' | 'id'
    needsBody?: boolean
  }
> = {
  list: { method: 'GET', path: '/api/prices/products' },
  search: { method: 'GET', path: '/api/prices/products', needsQuery: 'q' },
  calc: { method: 'POST', path: '/api/prices/calc', needsBody: true },
  create: { method: 'POST', path: '/api/prices/products', needsBody: true },
  update: { method: 'PUT', path: '/api/prices/products', needsQuery: 'id', needsBody: true },
  delete: { method: 'DELETE', path: '/api/prices/products', needsQuery: 'id' },
}

/** Endpoint display strings used in dropdown & request badge (does not rely on PRICES_API_ENDPOINTS.path shortcuts). */
const PRICES_API_ENDPOINT_DISPLAY: Record<PricesApiEndpoint, { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; path: string; admin?: boolean }> = {
  list: { method: 'GET', path: '/api/prices/products' },
  search: { method: 'GET', path: '/api/prices/products/search?q={keyword}' },
  calc: { method: 'POST', path: '/api/prices/calc' },
  create: { method: 'POST', path: '/api/prices/products', admin: true },
  update: { method: 'PUT', path: '/api/prices/products?id={id}', admin: true },
  delete: { method: 'DELETE', path: '/api/prices/products?id={id}', admin: true },
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
export interface PricesApiPlaygroundProps {
  /** Whether to show authenticated CURD endpoints in the playground */
  canWrite: boolean
  /**
   * Optional admin API key injected by the page.
   * Notes:
   * - The real API KEY should be configured as a server-side environment variable.
   * - Avoid hardcoding secrets in client bundles; only inject the value when the server explicitly provides it.
   * - When absent we still show `<API_KEY>` in request examples.
   */
  adminApiKey?: string | null
}

export function PricesApiPlayground(props: PricesApiPlaygroundProps) {
  const { canWrite, adminApiKey } = props
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [endpointOpen, setEndpointOpen] = useState(false)
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

  useEffect(() => {
    if (!endpointOpen) return
    function onPointerDown(event: MouseEvent) {
      const el = dropdownRef.current
      if (!el) return
      if (event.target instanceof Node && !el.contains(event.target)) {
        setEndpointOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [endpointOpen])

  const endpointOptions: PricesApiEndpoint[] = useMemo(() => {
    const base: PricesApiEndpoint[] = ['list', 'search', 'calc']
    if (!canWrite) return base
    return [...base, 'create', 'update', 'delete']
  }, [canWrite])

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const selected = PRICES_API_ENDPOINTS[state.endpoint]

      const q = state.query.trim()
      let url: string = selected.path
      if (state.endpoint === 'search') {
        if (!q) throw new Error('q is required for search')
        url = `/api/prices/products/search?q=${encodeURIComponent(q)}`
      } else if (state.endpoint === 'update' || state.endpoint === 'delete') {
        if (!q) throw new Error('id is required')
        url = `/api/prices/products?id=${encodeURIComponent(q)}`
      }

      const requestInit: RequestInit = {
        method: selected.method,
        headers: { Accept: 'application/json, text/html;q=0.9,*/*;q=0.8' },
      }
      if (selected.method === 'POST' || selected.method === 'PUT') {
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
  const selectedDisplay = PRICES_API_ENDPOINT_DISPLAY[endpoint]

  const requestExamples: RequestExampleInput | null = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const q = query.trim()
    let url = `${origin}${selected.path}`
    if (endpoint === 'search') {
      url = `${origin}/api/prices/products/search?q=${encodeURIComponent(q)}`
    } else if (endpoint === 'update' || endpoint === 'delete') {
      url = `${origin}/api/prices/products?id=${encodeURIComponent(q)}`
    }

    const headers: Record<string, string> = { Accept: 'application/json, text/html;q=0.9,*/*;q=0.8' }

    const isAdminCurd = endpoint === 'create' || endpoint === 'update' || endpoint === 'delete'
    if (canWrite && isAdminCurd) {
      const resolvedKey = adminApiKey?.trim() ? adminApiKey.trim() : '<API_KEY>'
      // Request examples for ADMIN-protected endpoints: use a simple header-based API key placeholder.
      headers.Authorization = `Bearer ${resolvedKey}`
    }

    if (selected.method === 'POST' || selected.method === 'PUT') {
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
            <span className={`${PLAYGROUND_HEADER_BADGE_CLASS} inline-flex items-center gap-1 whitespace-nowrap`}>
              {selectedDisplay.method} {selectedDisplay.path}
              {selectedDisplay.admin ? (
                <Tooltip content="ADMIN" placement="top">
                  <MdOutlineAdminPanelSettings className="h-3 w-3 text-indigo-700" aria-label="ADMIN" />
                </Tooltip>
              ) : null}
            </span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Endpoint</span>
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setEndpointOpen((open) => !open)}
                  className="flex h-8 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  aria-haspopup="listbox"
                  aria-expanded={endpointOpen}
                >
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="min-w-0 truncate leading-none">
                      {selectedDisplay.method} {selectedDisplay.path}
                    </span>
                    {selectedDisplay.admin ? (
                      <Tooltip content="ADMIN" placement="top">
                        <MdOutlineAdminPanelSettings className="h-3 w-3 shrink-0 text-indigo-700" aria-label="ADMIN" />
                      </Tooltip>
                    ) : null}
                  </div>
                  <TbChevronDown className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${endpointOpen ? 'rotate-180' : ''}`} />
                </button>

                {endpointOpen ? (
                  <div
                    role="listbox"
                    aria-label="Endpoint"
                    className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-md"
                  >
                    {endpointOptions.map((opt) => {
                      const display = PRICES_API_ENDPOINT_DISPLAY[opt]
                      const isSelected = opt === endpoint

                      return (
                        <button
                          key={opt}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                          onClick={() => {
                            setState((prev) => ({ ...prev, endpoint: opt }))
                            setEndpointOpen(false)
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 truncate leading-none">
                              {display.method} {display.path}
                            </span>
                            {display.admin ? (
                              <Tooltip content="ADMIN" placement="top">
                                <MdOutlineAdminPanelSettings className="h-3 w-3 shrink-0 text-indigo-700" aria-label="ADMIN" />
                              </Tooltip>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </label>
            {endpoint === 'search' || endpoint === 'update' || endpoint === 'delete' ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-gray-700">{endpoint === 'search' ? 'q' : endpoint === 'update' ? 'id' : 'id'}</span>
                <input
                  type="text"
                  className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  value={query}
                  onChange={(event) => setState((prev) => ({ ...prev, query: event.target.value }))}
                  placeholder={endpoint === 'search' ? 'cola' : '12'}
                />
              </label>
            ) : null}
            {endpoint === 'calc' || endpoint === 'create' || endpoint === 'update' ? (
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

'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import SearchableSelect from '@/components/SearchableSelect'

type PricesMcpEndpoint = 'manifest' | 'call'

const PRICES_MCP_ENDPOINTS: Record<PricesMcpEndpoint, { method: 'GET' | 'POST'; path: '/api/mcp/prices' }> = {
  manifest: { method: 'GET', path: '/api/mcp/prices' },
  call: { method: 'POST', path: '/api/mcp/prices' },
}

interface PricesMcpState {
  loading: boolean
  endpoint: PricesMcpEndpoint
  tool: string
  paramsText: string
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
}

/**
 * Playground for prices MCP endpoints.
 * @returns Prices MCP playground
 */
export function PricesMcpPlayground() {
  const [state, setState] = useState<PricesMcpState>({
    loading: false,
    endpoint: 'call',
    tool: 'list_price_lists',
    paramsText: '{}',
  })

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const selected = PRICES_MCP_ENDPOINTS[state.endpoint]

      const requestInit: RequestInit = {
        method: selected.method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      }

      if (selected.method === 'POST') {
        const parsedParams = state.paramsText.trim() ? JSON.parse(state.paramsText) : {}
        requestInit.body = JSON.stringify({
          tool: state.tool.trim(),
          params: parsedParams,
        })
      }

      const response = await fetch(selected.path, requestInit)
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

  const { loading, endpoint, tool, paramsText, status, durationMs, error, responseBody } = state
  const selected = PRICES_MCP_ENDPOINTS[endpoint]

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
              <SearchableSelect
                className="w-full"
                value={endpoint}
                onChange={(value) => setState((prev) => ({ ...prev, endpoint: value as PricesMcpEndpoint }))}
                options={[
                  { value: 'manifest', label: 'GET /api/mcp/prices - manifest' },
                  { value: 'call', label: 'POST /api/mcp/prices - tool call' },
                ]}
                clearable={false}
                size="sm"
              />
            </label>

            {selected.method === 'POST' ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">Tool name</span>
                  <input
                    type="text"
                    value={tool}
                    onChange={(event) => setState((prev) => ({ ...prev, tool: event.target.value }))}
                    className="h-8 rounded border border-gray-300 bg-white px-2 text-sm text-gray-900"
                    placeholder="prices.list_products"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-gray-700">Params (JSON)</span>
                  <textarea
                    className="h-28 resize-none rounded border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[10px] text-gray-900"
                    spellCheck={false}
                    value={paramsText}
                    onChange={(event) => setState((prev) => ({ ...prev, paramsText: event.target.value }))}
                  />
                </label>
              </>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send request'}
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
    </div>
  )
}

'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

interface DnsMcpState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  paramsText: string
}

/**
 * MCP playground for dns_query tool. Default params: { domain: "example.com", dns: "1.1.1.1" }.
 */
export function DnsMcpPlayground() {
  const [state, setState] = useState<DnsMcpState>({
    loading: false,
    paramsText: '{"domain": "example.com", "dns": "1.1.1.1"}',
  })

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const parsedParams = state.paramsText.trim() ? JSON.parse(state.paramsText) : {}

      setState((prev) => ({ ...prev, loading: true, error: undefined }))

      const startedAt = performance.now()
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ tool: 'dns_query', params: parsedParams }),
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

  const { loading, status, durationMs, error, responseBody, paramsText } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>POST /api/mcp</span>
          </div>
          <div className="space-y-2 px-3 py-2 text-[11px] text-gray-700">
            <p className="text-[10px] text-gray-500">Tool: dns_query. Params: domain (required), dns (optional).</p>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Params (JSON)</span>
              <textarea
                className="min-h-[80px] rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[11px] text-gray-900"
                value={paramsText}
                onChange={(e) => setState((prev) => ({ ...prev, paramsText: e.target.value }))}
                placeholder='{"domain": "example.com"}'
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send request'}
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
            {error ? (
              <pre className="text-red-600">{error}</pre>
            ) : responseBody ? (
              <JsonViewer value={responseBody} />
            ) : (
              <span className="text-gray-500">No response yet. Send a request to see the result.</span>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

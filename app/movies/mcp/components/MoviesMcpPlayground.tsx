'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

interface MoviesMcpState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  paramsText: string
}

/**
 * Client-side playground for movies MCP tool (list_latest_movies).
 */
export function MoviesMcpPlayground() {
  const [state, setState] = useState<MoviesMcpState>({
    loading: false,
    paramsText: '{}',
  })

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      let params: unknown = {}
      if (state.paramsText.trim()) params = JSON.parse(state.paramsText)
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ tool: 'list_latest_movies', params }),
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
      <div className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100">
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>POST /api/mcp</span>
          </div>
          <form onSubmit={handleSendRequest} className="space-y-2 px-3 py-2 text-[11px] text-gray-700">
            <p className="text-[11px] text-gray-600">Tool: list_latest_movies. Params: optional year (e.g. {'{ "year": 2025 }'})</p>
            <textarea
              value={paramsText}
              onChange={(e) => setState((prev) => ({ ...prev, paramsText: e.target.value }))}
              rows={3}
              className="w-full rounded border border-gray-200 p-2 font-mono text-[10px]"
              placeholder="{}"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send request'}
            </button>
            {durationMs !== undefined && <p className="text-[10px] text-gray-500">Last request: {durationMs.toFixed(0)} ms</p>}
          </form>
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
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

interface HolidayApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
}

/**
 * Client-side playground for /api/holiday.
 */
export function HolidayApiPlayground() {
  const [state, setState] = useState<HolidayApiState>({
    loading: false,
  })

  async function handleSendRequest() {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const response = await fetch('/api/holiday', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })
      const durationMs = performance.now() - startedAt
      const text = await response.text()

      setState({
        loading: false,
        status: response.status,
        durationMs,
        error: undefined,
        responseBody: text,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setState({
        loading: false,
        status: undefined,
        durationMs: undefined,
        error: message,
        responseBody: undefined,
      })
    }
  }

  const { loading, status, durationMs, error, responseBody } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100">
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>GET /api/holiday</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <p className="text-[11px] text-gray-600">This endpoint does not require parameters. Click the button below to send a request.</p>
            <button
              type="button"
              className="inline-flex w-fit items-center justify-center self-start rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSendRequest}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send request'}
            </button>
            {durationMs !== undefined && <p className="text-[10px] text-gray-500">Last request: {durationMs.toFixed(0)} ms</p>}
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
      </div>
    </div>
  )
}

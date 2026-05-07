'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import type { RequestExampleInput } from '@/utils/requestExamples'

interface GeoApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  latitude: string
  longitude: string
}

/**
 * Client-side playground for GET /api/geo (cacheable by URL; prefer GET for browser cache).
 */
export function GeoApiPlayground() {
  const [state, setState] = useState<GeoApiState>({
    loading: false,
    latitude: '39.9042',
    longitude: '116.4074',
  })

  const [examplesOpen, setExamplesOpen] = useState(false)

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const lat = parseFloat(state.latitude)
    const lng = parseFloat(state.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setState((prev) => ({ ...prev, error: 'Invalid latitude or longitude' }))
      return
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const url = `/api/geo?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`
      const response = await fetch(url, { method: 'GET', cache: 'default' })
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

  const { loading, status, durationMs, error, responseBody, latitude, longitude } = state

  const requestExamples: RequestExampleInput | null = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return {
      method: 'GET',
      url: `${origin}/api/geo?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`,
    }
  })()

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>GET /api/geo</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Latitude</span>
              <input
                type="text"
                className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                value={latitude}
                onChange={(e) => setState((prev) => ({ ...prev, latitude: e.target.value }))}
                placeholder="39.9042"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Longitude</span>
              <input
                type="text"
                className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                value={longitude}
                onChange={(e) => setState((prev) => ({ ...prev, longitude: e.target.value }))}
                placeholder="116.4074"
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
      <RequestExamplesPopup open={examplesOpen} onClose={() => setExamplesOpen(false)} request={requestExamples} defaultTab="curl" />
    </div>
  )
}

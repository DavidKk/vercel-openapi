'use client'

import { useState } from 'react'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'

interface DnsApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
  domain: string
  dns: string
}

/**
 * Playground for GET /api/dns. Params: domain (required), dns (optional).
 */
export function DnsApiPlayground() {
  const [state, setState] = useState<DnsApiState>({
    loading: false,
    domain: 'example.com',
    dns: '1.1.1.1',
  })

  async function handleSendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const domain = state.domain.trim()
    if (!domain) {
      setState((prev) => ({ ...prev, error: 'Domain is required' }))
      return
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const params = new URLSearchParams({ domain })
      if (state.dns.trim()) params.set('dns', state.dns.trim())
      const startedAt = performance.now()
      const response = await fetch(`/api/dns?${params.toString()}`, { method: 'GET', cache: 'default' })
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

  const { loading, status, durationMs, error, responseBody, domain, dns } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <form className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100" onSubmit={handleSendRequest}>
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>GET /api/dns</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">Domain (required)</span>
              <input
                type="text"
                className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                value={domain}
                onChange={(e) => setState((prev) => ({ ...prev, domain: e.target.value }))}
                placeholder="example.com"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">DNS (optional, default 1.1.1.1)</span>
              <input
                type="text"
                className="h-7 rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
                value={dns}
                onChange={(e) => setState((prev) => ({ ...prev, dns: e.target.value }))}
                placeholder="1.1.1.1"
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

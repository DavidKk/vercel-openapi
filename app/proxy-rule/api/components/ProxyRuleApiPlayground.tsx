'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { getClashConfigTypeFormOptions } from '@/app/proxy-rule/clash-config-type-options'
import { CompactJsonViewer } from '@/components/CompactJsonViewer'
import { FormSelect } from '@/components/FormSelect'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import type { RequestExampleInput } from '@/utils/requestExamples'

interface ProxyRuleApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
}

const CLASH_TYPE_OPTIONS = getClashConfigTypeFormOptions()

/**
 * Playground for GET /api/proxy-rule/clash/config (public).
 */
export function ProxyRuleApiPlayground() {
  const [type, setType] = useState('Proxy')
  const [state, setState] = useState<ProxyRuleApiState>({ loading: false })
  const [examplesOpen, setExamplesOpen] = useState(false)

  async function handleSendRequest() {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const params = new URLSearchParams({ type: type.trim() || 'Proxy' })
      const response = await fetch(`/api/proxy-rule/clash/config?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
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

  const requestExamples: RequestExampleInput = (() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({ type: 'Proxy' })
    return {
      method: 'GET',
      url: `${origin}/api/proxy-rule/clash/config?${params.toString()}`,
      headers: { Accept: 'application/json' },
    }
  })()

  const { loading, status, durationMs, error, responseBody } = state

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100">
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <button
              type="button"
              onClick={() => setExamplesOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              aria-label="Request examples"
              title="Request examples"
            >
              <TbCode className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 px-3 py-2 text-[11px]">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-700">type (query)</span>
              <FormSelect value={type} onChange={setType} options={CLASH_TYPE_OPTIONS} />
            </label>
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={loading}
              className="h-8 w-fit rounded-md bg-gray-900 px-3 text-xs font-medium text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Send'}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Response</span>
            {status !== undefined && (
              <span className={PLAYGROUND_HEADER_BADGE_CLASS}>
                {status}
                {durationMs !== undefined ? ` · ${durationMs.toFixed(0)}ms` : ''}
              </span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
            {responseBody ? <CompactJsonViewer value={responseBody} /> : null}
          </div>
        </div>
      </div>
      <RequestExamplesPopup open={examplesOpen} onClose={() => setExamplesOpen(false)} request={requestExamples} defaultTab="curl" />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { TbCode } from 'react-icons/tb'

import { PLAYGROUND_HEADER_BADGE_CLASS } from '@/app/Nav/constants'
import { JsonViewer } from '@/components/JsonViewer'
import { PlaygroundPanelHeader } from '@/components/PlaygroundPanelHeader'
import { RequestExamplesPopup } from '@/components/RequestExamplesPopup'
import type { RequestExampleInput } from '@/utils/requestExamples'

type ApiTab = 'sources' | 'feed'

interface NewsApiState {
  loading: boolean
  status?: number
  durationMs?: number
  error?: string
  responseBody?: string
}

/**
 * Client playground for GET /api/news/sources and GET /api/news/feed.
 */
export function NewsApiPlayground() {
  const [tab, setTab] = useState<ApiTab>('feed')
  const [category, setCategory] = useState('')
  const [region, setRegion] = useState('')
  const [limit, setLimit] = useState('30')
  const [offset, setOffset] = useState('0')
  const [maxFeeds, setMaxFeeds] = useState('15')
  const [state, setState] = useState<NewsApiState>({ loading: false })
  const [examplesOpen, setExamplesOpen] = useState(false)

  function buildUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (tab === 'sources') {
      const q = new URLSearchParams()
      if (category.trim()) q.set('category', category.trim())
      if (region.trim()) q.set('region', region.trim())
      const qs = q.toString()
      return `${origin}/api/news/sources${qs ? `?${qs}` : ''}`
    }
    const q = new URLSearchParams()
    if (category.trim()) q.set('category', category.trim())
    if (region.trim()) q.set('region', region.trim())
    if (limit.trim()) q.set('limit', limit.trim())
    if (offset.trim() && offset.trim() !== '0') q.set('offset', offset.trim())
    if (maxFeeds.trim()) q.set('maxFeeds', maxFeeds.trim())
    const qs = q.toString()
    return `${origin}/api/news/feed${qs ? `?${qs}` : ''}`
  }

  async function handleSendRequest() {
    try {
      setState((prev) => ({ ...prev, loading: true, error: undefined }))
      const startedAt = performance.now()
      const url = buildUrl()
      const response = await fetch(url, {
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

  const { loading, status, durationMs, error, responseBody } = state
  const pathLabel = tab === 'sources' ? 'GET /api/news/sources' : 'GET /api/news/feed'

  const requestExamples: RequestExampleInput = {
    method: 'GET',
    url: buildUrl(),
    headers: { Accept: 'application/json' },
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <PlaygroundPanelHeader />
      <div className="flex min-h-0 flex-1 flex-col gap-px bg-gray-100">
        <div className="flex flex-col bg-white">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 text-[11px]">
            <span className="font-medium text-gray-800">Request</span>
            <span className={PLAYGROUND_HEADER_BADGE_CLASS}>{pathLabel}</span>
          </div>
          <div className="flex flex-col gap-2 px-3 py-2 text-[11px] text-gray-700">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded border px-2 py-1 text-[11px] font-medium ${tab === 'sources' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
                onClick={() => setTab('sources')}
              >
                Sources
              </button>
              <button
                type="button"
                className={`rounded border px-2 py-1 text-[11px] font-medium ${tab === 'feed' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700'}`}
                onClick={() => setTab('feed')}
              >
                Feed
              </button>
            </div>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-500">category (optional)</span>
              <input
                className="rounded border border-gray-200 px-2 py-1 font-mono text-[11px]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. tech-internet"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] text-gray-500">region (optional)</span>
              <input
                className="rounded border border-gray-200 px-2 py-1 font-mono text-[11px]"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="cn or hk_tw"
              />
            </label>
            {tab === 'feed' && (
              <>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500">limit</span>
                  <input className="rounded border border-gray-200 px-2 py-1 font-mono text-[11px]" value={limit} onChange={(e) => setLimit(e.target.value)} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500">offset</span>
                  <input className="rounded border border-gray-200 px-2 py-1 font-mono text-[11px]" value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="0" />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500">maxFeeds</span>
                  <input className="rounded border border-gray-200 px-2 py-1 font-mono text-[11px]" value={maxFeeds} onChange={(e) => setMaxFeeds(e.target.value)} />
                </label>
              </>
            )}
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                className="inline-flex w-fit items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSendRequest}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send request'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setExamplesOpen(true)}
                aria-label="Request examples"
                title="Request examples"
                disabled={loading}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <TbCode className="h-3 w-3" />
                </span>
              </button>
            </div>
            {durationMs !== undefined && <p className="text-[10px] text-gray-500">Last request: {durationMs.toFixed(0)} ms</p>}
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
      </div>
      <RequestExamplesPopup open={examplesOpen} onClose={() => setExamplesOpen(false)} request={requestExamples} defaultTab="curl" />
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'

import type { DnsResult } from '../types'
import { DnsEndpointInput } from './DnsEndpointInput'
import { ResultGroupedView } from './ResultGroupedView'

const MAX_RESULT_HISTORY = 10

/** L0 in-memory cache TTL in milliseconds (5 minutes). */
const L0_CACHE_TTL_MS = 5 * 60 * 1000

function cacheKey(domain: string, dns: string): string {
  return `${domain}|${dns}`
}

/**
 * Overview form with multi-result history: switch via prev/next on result card.
 * Uses L0 in-memory cache with TTL to avoid re-requesting same domain+dns within validity.
 */
export function DnsQueryForm() {
  const [dns, setDns] = useState('1.1.1.1')
  const [domain, setDomain] = useState('example.com')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<DnsResult[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const l0CacheRef = useRef<Map<string, { result: DnsResult; expiresAt: number }>>(new Map())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const domainTrimmed = domain.trim()
    if (!domainTrimmed) {
      setError('Please enter a domain.')
      return
    }

    const dnsTrimmed = dns.trim()
    setError(null)

    const existingIndex = results.findIndex((r) => r.domain === domainTrimmed && r.dns === dnsTrimmed)
    if (existingIndex >= 0) {
      setActiveIndex(existingIndex)
      return
    }

    const key = cacheKey(domainTrimmed, dnsTrimmed)
    const cached = l0CacheRef.current.get(key)
    const now = Date.now()
    if (cached && cached.expiresAt > now) {
      setResults((prev) => [cached.result, ...prev].slice(0, MAX_RESULT_HISTORY))
      setActiveIndex(0)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ domain: domainTrimmed })
      if (dnsTrimmed) params.set('dns', dnsTrimmed)
      const res = await fetch(`/api/dns?${params.toString()}`, { method: 'GET', cache: 'default' })
      const json = await res.json()

      if (res.ok && json?.data) {
        const next = json.data as DnsResult
        l0CacheRef.current.set(key, { result: next, expiresAt: now + L0_CACHE_TTL_MS })
        setResults((prev) => [next, ...prev].slice(0, MAX_RESULT_HISTORY))
        setActiveIndex(0)
      } else {
        setError(json?.data?.error ?? json?.message ?? `HTTP ${res.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const currentResult = results[activeIndex] ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top: form 20% from container top, horizontal center */}
      <div className="flex min-h-[30vh] shrink-0 flex-1 basis-0 flex-col px-4 pt-0 pb-2">
        <div className="shrink-0 basis-[20%]" aria-hidden />
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md shrink-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">DNS service endpoint</span>
                <DnsEndpointInput
                  value={dns}
                  onChange={setDns}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Domain</span>
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-xl border border-gray-200 bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Querying…' : 'Query'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results: card tabs + content */}
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 pt-3">
        {error && (
          <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {results.length > 0 && currentResult && (
          <div className="mx-auto max-w-xl">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-gray-500">
                  {currentResult.domain}
                  {currentResult.dns ? ` · ${currentResult.dns}` : ''}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                    disabled={activeIndex === 0}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                    aria-label="Previous result"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((i) => Math.min(results.length - 1, i + 1))}
                    disabled={activeIndex === results.length - 1}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                    aria-label="Next result"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              {currentResult.records.length === 0 ? <p className="text-sm text-gray-500">No records returned.</p> : <ResultGroupedView records={currentResult.records} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

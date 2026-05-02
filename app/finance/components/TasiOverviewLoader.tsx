'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import { useDebugPanel } from '@/components/DebugPanel'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from '@/services/finance/tasi'
import { getLatestValidSnapshotFromIdb } from '@/services/finance/tasi/browser'

import { TasiOverview } from './TasiOverview'

/** Props for the shared stock/TASI overview skeleton. */
export interface TasiOverviewSkeletonProps {
  /**
   * Optional left header label in the skeleton header. When empty, a pulse placeholder is shown
   * (matches live overview when `headerTitle` is omitted).
   */
  leadingTitle?: string
  /** Same as live overview header (e.g. market dropdown); when set, replaces the right-side pulse. */
  headerAddon?: ReactNode
  /** Accessible name for the busy region. */
  ariaLabel?: string
}

/**
 * Skeleton for stock overview: header row + market summary strip + table header + body rows.
 * Used by TASI loader and FMP market loader for identical loading UX.
 */
export function TasiOverviewSkeleton(props?: TasiOverviewSkeletonProps) {
  const leadingTitle = props?.leadingTitle?.trim() ?? ''
  const ariaLabel = props?.ariaLabel ?? 'Loading overview data'
  const showLeadingTitle = leadingTitle.length > 0
  const { headerAddon } = props ?? {}
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label={ariaLabel}>
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className={`shrink-0 min-h-[63px] ${CONTENT_HEADER_CLASS} gap-2`}>
          {showLeadingTitle ? (
            <span className="text-base font-semibold text-gray-700">{leadingTitle}</span>
          ) : (
            <span className="h-6 w-24 shrink-0 animate-pulse rounded bg-gray-200" aria-hidden />
          )}
          {headerAddon != null ? headerAddon : null}
          <div className="relative ml-auto h-9 w-56 animate-pulse rounded border border-gray-200 bg-gray-100" aria-hidden />
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Loading latest trading day data</caption>
            <thead className="sticky top-0 z-20 bg-gray-100">
              <tr className="bg-gray-50">
                <th colSpan={11} scope="row" className="h-[100px] bg-gray-50 px-4 py-3 text-left font-normal">
                  <div className="flex flex-col gap-3 text-base text-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Market summary</span>
                      <span className="h-5 w-20 animate-pulse rounded bg-gray-200" aria-hidden />
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 lg:grid-cols-7">
                      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="flex flex-col">
                          <span className="h-4 w-16 animate-pulse rounded bg-gray-200" aria-hidden />
                          <span className="mt-0.5 h-6 w-20 animate-pulse rounded bg-gray-100" aria-hidden />
                        </div>
                      ))}
                    </div>
                  </div>
                </th>
              </tr>
              <tr className="shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                {Array.from({ length: 11 }).map((_, i) => (
                  <th key={i} scope="col" className="border-b border-gray-200 px-2 py-2.5">
                    <span className="inline-block h-4 w-16 animate-pulse rounded bg-gray-200" aria-hidden />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 14 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1.5">
                    <span className="inline-block h-4 w-12 animate-pulse rounded bg-gray-200" aria-hidden />
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-100" aria-hidden />
                  </td>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                    <td key={j} className="px-2 py-1.5 text-right">
                      <span className="inline-block ml-auto h-4 w-14 animate-pulse rounded bg-gray-100" aria-hidden />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

/**
 * Client-side loader for TASI overview: IDB cache used only when not expired (same TTL as server KV snapshot); else fetch from API.
 */
export function TasiOverviewLoader(props?: { headerTitle?: string; headerAddon?: ReactNode }) {
  const [company, setCompany] = useState<TasiCompanyDailyRecord[] | null>(null)
  const [summary, setSummary] = useState<TasiMarketSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null

  useEffect(() => {
    let cancelled = false

    /** Use IDB only if snapshot exists and is not expired (same TTL as server). When valid, skip API. */
    async function run() {
      const snapshot = await getLatestValidSnapshotFromIdb()
      if (cancelled) return
      if (snapshot && snapshot.company.length > 0 && snapshot.summary) {
        setCompany(snapshot.company)
        setSummary(snapshot.summary)
        setError(null)
        setLoading(false)
        return
      }
      /** Cache miss or expired: fetch from API. */
      try {
        const [companyRes, summaryRes] = await Promise.all([
          fetch('/api/finance/market/company/daily?market=TASI', { cache: 'default' }),
          fetch('/api/finance/market/summary/daily?market=TASI', { cache: 'default' }),
        ])
        if (cancelled) return
        if (!companyRes.ok || !summaryRes.ok) {
          const msg = !companyRes.ok ? await companyRes.text() : await summaryRes.text()
          setError(msg || 'Failed to load data')
          setLoading(false)
          return
        }
        const [companyEnvelope, summaryEnvelope] = await Promise.all([companyRes.json(), summaryRes.json()])
        if (cancelled) return
        const companyList = Array.isArray(companyEnvelope?.data) ? companyEnvelope.data : null
        const summaryData = summaryEnvelope?.data != null && typeof summaryEnvelope.data === 'object' && !Array.isArray(summaryEnvelope.data) ? summaryEnvelope.data : null
        setCompany(companyList ?? null)
        setSummary(summaryData)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  if (forceError ?? error) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-base text-red-600">{forceError ? (debug?.errorMessage ?? forceError) : error}</p>
      </section>
    )
  }

  if (forceLoading || (loading && !company && !summary && !error)) {
    return <TasiOverviewSkeleton leadingTitle={props?.headerTitle} headerAddon={props?.headerAddon} ariaLabel="Loading TASI data" />
  }

  return <TasiOverview company={company} summary={summary} error={error} headerTitle={props?.headerTitle} headerAddon={props?.headerAddon} useTasiCurrencyLabels />
}

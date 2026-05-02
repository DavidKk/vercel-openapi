'use client'

import type { ReactNode } from 'react'

import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'

export interface FundEtfOhlcvOverviewSkeletonProps {
  /** Same header control as live overview (e.g. fund title dropdown). */
  headerAddon?: ReactNode
  /** Accessible name for the busy region. */
  ariaLabel?: string
}

/**
 * Skeleton for fund/ETF overview: header row, latest-session strip, and daily history table placeholders.
 * Matches layout spacing of `FundEtfOhlcvOverview` and the stock `TasiOverviewSkeleton` patterns.
 *
 * @param props Optional header slot and aria label
 * @returns Non-interactive loading placeholder
 */
export function FundEtfOhlcvOverviewSkeleton(props?: FundEtfOhlcvOverviewSkeletonProps) {
  const { headerAddon, ariaLabel = 'Loading fund data' } = props ?? {}
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label={ariaLabel}>
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className={`shrink-0 min-h-[63px] ${CONTENT_HEADER_CLASS} overflow-visible`}>
          {headerAddon != null ? headerAddon : <span className="h-6 w-56 shrink-0 animate-pulse rounded bg-gray-200" aria-hidden />}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex flex-col gap-3 text-base text-gray-800">
              <div className="flex items-center justify-between">
                <span className="h-5 w-32 animate-pulse rounded bg-gray-200" aria-hidden />
                <span className="h-5 w-28 animate-pulse rounded bg-gray-200" aria-hidden />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4 lg:grid-cols-7">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="h-4 w-14 animate-pulse rounded bg-gray-200" aria-hidden />
                    <span className="mt-0.5 h-6 w-20 animate-pulse rounded bg-gray-100" aria-hidden />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <table className="w-full min-w-[640px] border-collapse text-left text-sm text-gray-800">
            <caption className="sr-only">Loading daily history</caption>
            <thead className="sticky top-0 z-20 bg-gray-100">
              <tr className="shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <th key={i} scope="col" className={`border-b border-gray-200 px-2 py-2.5 ${i === 0 ? 'whitespace-nowrap text-left' : 'text-right'}`}>
                    <span className={`inline-block h-4 animate-pulse rounded bg-gray-200 ${i === 0 ? 'w-24' : 'ml-auto w-16'}`} aria-hidden />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }).map((_, row) => (
                <tr key={row} className="border-b border-gray-100">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5">
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" aria-hidden />
                  </td>
                  {Array.from({ length: 7 }).map((__, col) => (
                    <td key={col} className="px-2 py-1.5 text-right">
                      <span className="ml-auto inline-block h-4 w-14 animate-pulse rounded bg-gray-100" aria-hidden />
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

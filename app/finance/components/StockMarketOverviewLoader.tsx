'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { FMP_UNSUPPORTED_STOCK_MARKETS } from '@/app/finance/stock/fmpUnsupportedMarkets'
import { useDebugPanel } from '@/components/DebugPanel'
import type { StockMarket } from '@/services/finance/stock/types'
import type { TasiMarketSummary } from '@/services/finance/tasi'

import { TasiOverview } from './TasiOverview'
import { TasiOverviewSkeleton } from './TasiOverviewLoader'

interface StockMarketOverviewLoaderProps {
  /** Non-TASI stock market (parent only mounts this when not TASI). */
  market: StockMarket
  headerTitle?: string
  headerAddon?: ReactNode
}

/**
 * Client-side loader for non-TASI index overview (Yahoo + Eastmoney upstream): same skeleton as
 * {@link TasiOverviewLoader}; loads market summary only (no company table).
 */
export function StockMarketOverviewLoader({ market, headerTitle = '', headerAddon }: StockMarketOverviewLoaderProps) {
  const [summary, setSummary] = useState<TasiMarketSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    setSummary(null)

    if (FMP_UNSUPPORTED_STOCK_MARKETS.has(market)) {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    async function run() {
      try {
        const res = await fetch(`/api/finance/stock/summary?market=${encodeURIComponent(market)}`, {
          cache: 'no-store',
        })
        if (cancelled) return
        if (!res.ok) {
          setError(await res.text().catch(() => 'Failed to load data'))
          return
        }
        const envelope = (await res.json()) as {
          code?: number
          message?: string
          data?: {
            summary?: {
              date: string
              open: number | null
              high: number | null
              low: number | null
              close: number | null
              change: number | null
              changePercent: number | null
              volumeTraded: number | null
              valueTraded: number | null
            } | null
          }
        }
        if (cancelled) return
        if (envelope.code !== 0) {
          setError(envelope.message ?? 'Failed to load data')
          setSummary(null)
          return
        }
        const marketSummary = envelope.data?.summary
        if (!marketSummary) {
          setSummary(null)
          setError(null)
          return
        }
        setSummary({
          date: marketSummary.date,
          open: marketSummary.open,
          high: marketSummary.high,
          low: marketSummary.low,
          close: marketSummary.close,
          change: marketSummary.change,
          changePercent: marketSummary.changePercent,
          companiesTraded: null,
          volumeTraded: marketSummary.volumeTraded,
          valueTraded: marketSummary.valueTraded,
          numberOfTrades: null,
          marketCap: null,
        })
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
  }, [market])

  if (forceError ?? error) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center p-4">
        <p className="text-base text-red-600">{forceError ? (debug?.errorMessage ?? forceError) : error}</p>
      </section>
    )
  }

  if (forceLoading || (loading && !summary && !error)) {
    return <TasiOverviewSkeleton leadingTitle={headerTitle} headerAddon={headerAddon} ariaLabel="Loading market data" />
  }

  return <TasiOverview company={[]} summary={summary} error={null} headerTitle={headerTitle} headerAddon={headerAddon} useTasiCurrencyLabels={false} />
}

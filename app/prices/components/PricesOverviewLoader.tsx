'use client'

import { useEffect, useState } from 'react'

import type { ProductType } from '@/app/actions/prices/product'
import { getPricesOverviewFromIdb, type PricesOverviewCachePayload, setPricesOverviewInIdb } from '@/services/prices/browser/idb-cache'

import { PricesCalculator } from '../PricesCalculator'

const CACHE_KEY = 'overview'

/**
 * Client-side loader for prices overview: IndexedDB first, then API fallback.
 * Reduces repeated network requests with a TTL-based local cache.
 */
export function PricesOverviewLoader() {
  const [payload, setPayload] = useState<PricesOverviewCachePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const cached = await getPricesOverviewFromIdb(CACHE_KEY)
        if (cancelled) return
        if (cached && Array.isArray(cached.products)) {
          setPayload(cached)
          setLoading(false)
          return
        }

        const response = await fetch('/api/prices/products', { cache: 'default' })
        if (cancelled) return
        if (!response.ok) {
          setError(await response.text().catch(() => 'Failed to load prices'))
          setLoading(false)
          return
        }

        const envelope = (await response.json()) as { code?: number; data?: ProductType[] | { products?: ProductType[] } }
        const products = Array.isArray(envelope?.data) ? envelope.data : envelope?.data?.products
        if (!Array.isArray(products)) {
          setError('Invalid prices response')
          setLoading(false)
          return
        }

        const nextPayload: PricesOverviewCachePayload = {
          products,
          cachedAt: Date.now(),
        }
        await setPricesOverviewInIdb(CACHE_KEY, nextPayload)
        if (!cancelled) {
          setPayload(nextPayload)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load prices')
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <section className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-red-600">{error}</p>
      </section>
    )
  }

  if (loading && !payload) {
    return (
      <section className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-gray-500">Loading prices...</p>
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col">
      <PricesCalculator products={payload?.products ?? []} />
    </section>
  )
}

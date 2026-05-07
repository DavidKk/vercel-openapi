'use client'

import { useEffect, useState } from 'react'
import { TbGasStation } from 'react-icons/tb'

import type { FuelPriceList } from '@/app/actions/fuel-price/types'
import { useDebugPanel } from '@/components/DebugPanel'
import { EmptyState } from '@/components/EmptyState'
import { createIdbCache, IDB_STORES, SHARED_DB_NAME } from '@/services/idb-cache'

import { FuelPriceTable } from './FuelPriceTable'

const FUEL_PRICE_TTL_MS = 60 * 60 * 1000 // 1 hour
const CACHE_KEY = 'latest'

/**
 * Client-side loader for fuel price overview: IDB first (TTL 1h), then API. Reduces API calls for repeat visits.
 */
export function FuelPriceOverviewLoader() {
  const [fuelPrices, setFuelPrices] = useState<FuelPriceList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null

  useEffect(() => {
    let cancelled = false
    const cache = createIdbCache<FuelPriceList>(SHARED_DB_NAME, IDB_STORES.FUEL_PRICE, FUEL_PRICE_TTL_MS)

    async function run() {
      const cached = await cache.get(CACHE_KEY)
      if (cancelled) return
      if (cached && Array.isArray(cached.current) && Array.isArray(cached.previous)) {
        setFuelPrices(cached)
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/fuel-price', { cache: 'default' })
        if (cancelled) return
        if (!res.ok) {
          setError(await res.text().catch(() => 'Failed to load'))
          setLoading(false)
          return
        }
        const envelope = (await res.json()) as { code?: number; data?: FuelPriceList }
        const data = envelope?.data
        if (cancelled) return
        if (data && Array.isArray(data.current) && Array.isArray(data.previous)) {
          await cache.set(CACHE_KEY, data)
          setFuelPrices(data)
        } else {
          setError('Invalid response')
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
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
      <section className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-base text-red-600">{forceError ? (debug?.errorMessage ?? forceError) : error}</p>
      </section>
    )
  }

  if (forceLoading || (loading && !fuelPrices)) {
    return (
      <section id="fuel-overview" className="flex h-full flex-col">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-4 py-3">
          <span className="text-base font-semibold text-gray-700">China Fuel Price</span>
          <div className="ml-auto h-9 w-24 animate-pulse rounded-lg bg-gray-200" aria-hidden />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['City', '92# Gasoline', '95# Gasoline', '98# Gasoline', '0# Diesel'].map((label) => (
                  <th key={label} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {Array.from({ length: 14 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200" aria-hidden />
                  </td>
                  {[0, 1, 2, 3].map((j) => (
                    <td key={j} className="px-6 py-3">
                      <div className="h-4 w-14 animate-pulse rounded bg-gray-100" aria-hidden />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const hasData = fuelPrices && (fuelPrices.current.length > 0 || fuelPrices.previous.length > 0)
  if (!hasData) {
    return (
      <section id="fuel-overview" className="flex h-full flex-col">
        <EmptyState icon={<TbGasStation className="h-12 w-12" />} message="No fuel price data available." />
      </section>
    )
  }

  return (
    <section id="fuel-overview" className="flex h-full flex-col">
      <FuelPriceTable fuelPrices={fuelPrices!} />
    </section>
  )
}

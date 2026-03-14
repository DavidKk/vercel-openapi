'use client'

import { useEffect, useState } from 'react'
import { TbMovie } from 'react-icons/tb'

import { useDebugPanel } from '@/components/DebugPanel'
import { EmptyState } from '@/components/EmptyState'
import { createIdbCache, IDB_STORES, SHARED_DB_NAME } from '@/services/idb-cache'
import type { MergedMovie } from '@/services/maoyan/types'

import { MovieList } from './MovieList'

interface MoviesCachePayload {
  movies: MergedMovie[]
  cachedAt: number
}

const MOVIES_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
const CACHE_KEY = 'latest'

/**
 * Client-side loader for movies overview: IDB first (TTL 2h), then API. Reduces API calls for repeat visits.
 */
export function MoviesOverviewLoader() {
  const [payload, setPayload] = useState<MoviesCachePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null

  useEffect(() => {
    let cancelled = false
    const cache = createIdbCache<MoviesCachePayload>(SHARED_DB_NAME, IDB_STORES.MOVIES, MOVIES_TTL_MS)

    async function run() {
      const cached = await cache.get(CACHE_KEY)
      if (cancelled) return
      if (cached && Array.isArray(cached.movies) && typeof cached.cachedAt === 'number') {
        setPayload(cached)
        setLoading(false)
        return
      }
      try {
        const res = await fetch('/api/movies', { cache: 'default' })
        if (cancelled) return
        if (!res.ok) {
          setError(await res.text().catch(() => 'Failed to load'))
          setLoading(false)
          return
        }
        const envelope = (await res.json()) as { code?: number; data?: MoviesCachePayload }
        const data = envelope?.data
        if (cancelled) return
        if (data && Array.isArray(data.movies) && typeof data.cachedAt === 'number') {
          await cache.set(CACHE_KEY, data)
          setPayload(data)
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

  if (forceLoading || (loading && !payload)) {
    return (
      <section className="flex h-full flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center border-b border-gray-200 px-4 py-3">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" aria-hidden />
          <div className="ml-auto flex items-center gap-2">
            <div className="h-[38px] w-20 animate-pulse rounded-lg bg-gray-100" aria-hidden />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-100" aria-hidden />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-b border-gray-200 bg-gray-50 px-3 py-3">
          <div className="grid auto-rows-min grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                <div className="aspect-[2/3] w-full animate-pulse bg-gray-200" aria-hidden />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" aria-hidden />
                  <div className="flex gap-1">
                    <div className="h-5 w-12 animate-pulse rounded-full bg-gray-100" aria-hidden />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-gray-100" aria-hidden />
                  </div>
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" aria-hidden />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center border-t border-gray-200 px-3 py-1">
          <div className="h-3 w-64 animate-pulse rounded bg-gray-100" aria-hidden />
        </div>
      </section>
    )
  }

  const movies = payload?.movies ?? []
  if (movies.length === 0) {
    return (
      <section className="flex h-full flex-col">
        <EmptyState icon={<TbMovie className="h-12 w-12" />} message="No movies data available." />
      </section>
    )
  }

  return (
    <section className="flex h-full flex-col">
      <MovieList movies={movies} cachedAt={payload?.cachedAt ?? 0} />
    </section>
  )
}

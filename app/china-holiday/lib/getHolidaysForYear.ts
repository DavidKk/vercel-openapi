/**
 * Browser-only: get holidays for a year from IDB (TTL 24h) or API. Use in Overview and Calendar to avoid unnecessary API calls.
 */

import type { Holiday } from '@/app/actions/holiday/api'
import { createIdbCache, IDB_STORES, SHARED_DB_NAME } from '@/services/idb-cache'

const HOLIDAY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const cache = createIdbCache<Holiday[]>(SHARED_DB_NAME, IDB_STORES.HOLIDAY_LIST, HOLIDAY_TTL_MS)

function cacheKey(year: number): string {
  return `year:${year}`
}

/**
 * Get holidays for a year: IDB first (if within TTL), then GET /api/holiday/list?year=.
 * On API success writes to IDB for next time.
 *
 * @param year Full year (e.g. 2025)
 * @returns Holidays array (possibly empty)
 */
export async function getHolidaysForYear(year: number): Promise<Holiday[]> {
  const key = cacheKey(year)
  const cached = await cache.get(key)
  if (cached && Array.isArray(cached)) return cached
  const res = await fetch(`/api/holiday/list?year=${year}`, { cache: 'default' })
  if (!res.ok) return []
  const body = (await res.json()) as { code?: number; data?: Holiday[] }
  if (body.code !== 0 || !Array.isArray(body.data)) return []
  await cache.set(key, body.data)
  return body.data
}

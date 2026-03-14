import { listHoliday } from '@/app/actions/holiday'
import { api } from '@/initializer/controller'
import { CACHE_CONTROL_LONG_LIVED, jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

/**
 * GET with ?year=YYYY. Same params = cacheable; use AJAX GET from client (no Server Action).
 */
export const GET = api(async (_req, context) => {
  const yearParam = context.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()

  const safeYear = Number.isFinite(year) && year > 1900 && year < 3000 ? year : new Date().getFullYear()
  const holidays = await listHoliday(safeYear)

  return jsonSuccess(holidays, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': CACHE_CONTROL_LONG_LIVED,
    }),
  })
})

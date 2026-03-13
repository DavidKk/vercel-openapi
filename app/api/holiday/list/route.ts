import { listHoliday } from '@/app/actions/holiday'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

export const GET = api(async (_req, context) => {
  const yearParam = context.searchParams.get('year')
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()

  const safeYear = Number.isFinite(year) && year > 1900 && year < 3000 ? year : new Date().getFullYear()
  const holidays = await listHoliday(safeYear)

  return jsonSuccess(holidays, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=600, stale-while-revalidate=1800',
    }),
  })
})

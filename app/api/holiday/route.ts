import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getTodaySpecial, isHolidayToady } from '@/app/actions/holiday'

export const runtime = 'edge'

export const GET = api(async () => {
  const isHoliday = await isHolidayToady()
  const name = await getTodaySpecial()
  return jsonSuccess(
    { isHoliday, name },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})

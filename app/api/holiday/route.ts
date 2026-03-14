import { getTodaySpecial, isHolidayToady } from '@/app/actions/holiday'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'

export const runtime = 'edge'

const logger = createLogger('api-holiday')

export const GET = api(async () => {
  logger.info('request today')
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

import { z } from 'zod'
import { tool } from '@/initializer/mcp'
import { isHolidayInNextDays } from '@/app/actions/holiday'

const name = 'is_future_holiday'
const description = 'Check if a future date (by days from today) is a holiday in China'
const paramsSchema = z.object({
  days: z.number().describe('Number of days from today to check, e.g. 1 for tomorrow, 7 for next week'),
})

export default tool(name, description, paramsSchema, async (params) => {
  const { days } = params
  const result = await isHolidayInNextDays(days)
  return { days, isHoliday: result }
})

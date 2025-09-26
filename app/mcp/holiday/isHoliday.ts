import { z } from 'zod'
import { tool } from '@/initializer/mcp'
import { isHoliday as checkIsHoliday } from '@/app/actions/holiday'

const name = 'is_holiday'
const description = 'Check if a specified date is a holiday in China'
const paramsSchema = z.object({
  date: z.string().describe('Date to check in YYYY-MM-DD format'),
})

export default tool(name, description, paramsSchema, async (params) => {
  const { date } = params
  const dateObj = new Date(date)
  const result = await checkIsHoliday(dateObj)
  return { date, isHoliday: result }
})

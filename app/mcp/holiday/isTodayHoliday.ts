import { z } from 'zod'

import { isHolidayToady } from '@/app/actions/holiday'
import { tool } from '@/initializer/mcp'

const name = 'is_today_holiday'
const description = 'Check if today is a holiday in China'
const paramsSchema = z.object({})

export default tool(name, description, paramsSchema, async () => {
  const result = await isHolidayToady()
  return { isHoliday: result }
})

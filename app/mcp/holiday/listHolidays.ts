import { z } from 'zod'

import { listHoliday } from '@/app/actions/holiday'
import { tool } from '@/initializer/mcp'

const name = 'list_holidays'
const description = 'Get holiday list for a specified year in China'
const paramsSchema = z.object({
  year: z.number().optional().describe('Year to query holidays for, defaults to current year'),
})

export default tool(name, description, paramsSchema, async (params) => {
  const { year } = params
  const holidays = await listHoliday(year)
  return holidays
})

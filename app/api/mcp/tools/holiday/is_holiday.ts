import { z } from 'zod'

import { isHoliday } from '@/app/actions/holiday'
import { tool } from '@/initializer/mcp'

/** MCP tool: check if a date is a holiday (China) */
export const is_holiday = tool(
  'is_holiday',
  'Check if a date is a holiday (China). Takes date string YYYY-MM-DD.',
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Date in YYYY-MM-DD format'),
  }),
  async (params) => {
    const holiday = await isHoliday(new Date(params.date + 'T12:00:00Z'))
    return { date: params.date, isHoliday: holiday }
  }
)

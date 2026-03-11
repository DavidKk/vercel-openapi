import { z } from 'zod'

import { isWorkday } from '@/app/actions/holiday'
import { tool } from '@/initializer/mcp'

/** MCP tool: check if a date is a workday (China) */
export const is_workday = tool(
  'is_workday',
  'Check if a date is a workday (China). Takes date string YYYY-MM-DD.',
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Date in YYYY-MM-DD format'),
  }),
  async (params) => {
    const workday = await isWorkday(new Date(params.date + 'T12:00:00Z'))
    return { date: params.date, isWorkday: workday }
  }
)

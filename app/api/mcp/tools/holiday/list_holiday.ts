import { z } from 'zod'

import { listHoliday } from '@/app/actions/holiday'
import { tool } from '@/initializer/mcp'

/** MCP tool: list holidays for a given year (China) */
export const list_holiday = tool(
  'list_holiday',
  'List holidays for a given year (China). Returns array of { date, name, isHoliday, isWorkDay?, isRestDay? }.',
  z.object({
    year: z.number().int().min(2000).max(2100).optional().describe('Year (default: current year)'),
  }),
  async (params) => {
    const year = params.year ?? new Date().getFullYear()
    const holidays = await listHoliday(year)
    return holidays
  }
)

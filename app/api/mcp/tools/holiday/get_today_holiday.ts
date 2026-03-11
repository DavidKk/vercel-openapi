import { z } from 'zod'

import { getTodaySpecial, isHolidayToady } from '@/app/actions/holiday'
import { tool } from '@/initializer/mcp'

/** MCP tool: get whether today is a holiday and name or weekday */
export const get_today_holiday = tool('get_today_holiday', 'Get whether today is a holiday and the holiday name or weekday (e.g. 星期一).', z.object({}), async () => {
  const isHolidayToday = await isHolidayToady()
  const name = await getTodaySpecial()
  return { isHoliday: isHolidayToday, name }
})

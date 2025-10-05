import { createMCPHttpServer } from '@/initializer/mcp'
import { version } from '@/package.json'

import { isFutureHoliday, isHoliday, isTodayHoliday, listHolidays } from './index'

const name = 'holiday-service'
const description = 'Provides Chinese holiday query service'

export const { manifest: GET, execute: POST } = createMCPHttpServer(name, version, description, {
  listHolidays,
  isHoliday,
  isTodayHoliday,
  isFutureHoliday,
})

import { getJsonKv, setJsonKv } from '@/services/kv/client'
import { createLogger } from '@/services/logger'

import { fetchAndParseHolidayData } from './timor'

export interface Holiday {
  date: string
  name: string
  isHoliday: boolean
  isWorkDay?: boolean
  isRestDay?: boolean
}

interface MemoryCache {
  [year: number]: Holiday[]
}

const MEMORY_CACHE: MemoryCache = {}
const logger = createLogger('holiday')

function getHolidayKvKey(year: number): string {
  return `holiday:${year}`
}

/**
 * 获取当前年份的节假日列表
 * 优先从内存缓存读取，其次从 KV 缓存读取，最后从远程 API 获取
 */
export async function listHoliday(year = new Date().getFullYear()) {
  // 优先从内存缓存读取
  if (MEMORY_CACHE[year]) {
    return MEMORY_CACHE[year]
  }

  try {
    const cache = await loadHolidayFromCache(year)
    if (cache.length > 0) {
      MEMORY_CACHE[year] = cache
      return cache
    }
  } catch (error) {
    logger.fail('load holiday from cache failed', error)
  }

  const holidays = await requestHoliday(year)
  MEMORY_CACHE[year] = holidays
  if (!holidays?.length) {
    return []
  }

  try {
    await saveHolidayToCache(year, holidays)
  } catch (error) {
    logger.fail('save holiday to cache failed', error)
  }

  return holidays
}

/**
 * 从远程API获取节假日数据
 * @throws 当请求失败或返回错误码时抛出异常
 */
async function requestHoliday(year = new Date().getFullYear()) {
  const holidayData = await fetchAndParseHolidayData(year)

  return Object.values(holidayData).map((holiday) => ({
    date: holiday.date,
    isHoliday: holiday.holiday,
    name: holiday.name,
    isWorkDay: holiday.wage === 1,
    isRestDay: holiday.wage === 2,
  }))
}

/**
 * Load holiday data from KV cache
 * @param currentYear Current year used to derive the KV key
 */
async function loadHolidayFromCache(year = new Date().getFullYear()) {
  const cached = await getJsonKv<Holiday[]>(getHolidayKvKey(year))
  return Array.isArray(cached) ? cached : []
}

/**
 * Save holiday data to KV cache
 * @param holidays Holiday array
 * @param currentYear Current year used to derive the KV key
 */
async function saveHolidayToCache(year = new Date().getFullYear(), holidays: Holiday[]) {
  if (!holidays?.length) return
  await setJsonKv(getHolidayKvKey(year), holidays)
}

/**
 * 判断指定日期是否为工作日
 * @param date 要判断的日期对象
 * @param holidays 节假日数据数组
 * @returns 如果是工作日返回true，否则返回false
 * @description 调班日视为工作日，节假日视为非工作日，默认周六周日为非工作日
 */
export function isWorkday(date: Date, holidays: Holiday[]): boolean {
  const dateStr = date.toISOString().split('T')[0]
  const holiday = holidays.find((h) => h.date === dateStr)

  // 如果是调班日，返回true（工作日）
  if (holiday?.isWorkDay) {
    return true
  }

  // 如果是假期，返回false（非工作日）
  if (holiday?.isHoliday) {
    return false
  }

  // 默认情况下，周六周日是非工作日
  return date.getDay() !== 0 && date.getDay() !== 6
}

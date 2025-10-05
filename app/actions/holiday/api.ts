import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'

import { fetchAndParseHolidayData } from './timor'
import type { HolidayApiResponse } from './type'

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

/**
 * 获取当前年份的节假日列表
 * 优先从内存缓存读取，其次从Gist缓存读取，最后从远程API获取
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
    // eslint-disable-next-line no-console
    console.error('load holiday from cache failed', error)
  }

  const holidays = await requestHoliday(year)
  MEMORY_CACHE[year] = holidays
  if (!holidays?.length) {
    return []
  }

  try {
    await saveHolidayToCache(year, holidays)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('save holiday to cache failed', error)
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
 * 从Gist缓存加载节假日数据
 * @param currentYear 当前年份，用于生成缓存文件名
 */
async function loadHolidayFromCache(year = new Date().getFullYear()) {
  const holidays = await readHolidaysFromGist('holidays.json', year)
  return holidays
}

/**
 * 将节假日数据保存到Gist缓存
 * @param holidays 节假日数据数组
 * @param currentYear 当前年份，用于生成缓存文件名
 */
async function saveHolidayToCache(year = new Date().getFullYear(), holidays: Holiday[]) {
  await writeHolidaysToGist('holidays.json', holidays, year)
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

/**
 * 从Gist读取节假日数据
 * @param fileName 文件名
 * @param year 可选年份，用于生成带年份的文件名
 */
export async function readHolidaysFromGist(fileName: string, year?: number): Promise<Holiday[]> {
  const { gistId, gistToken } = getGistInfo()
  const yearFileName = year ? `holidays-${year}.json` : fileName
  const content = await readGistFile({ gistId, gistToken, fileName: yearFileName })
  return JSON.parse(content) as Holiday[]
}

/**
 * 将节假日数据写入Gist
 * @param fileName 文件名
 * @param holidays 节假日数据数组
 * @param year 可选年份，用于生成带年份的文件名
 */
export async function writeHolidaysToGist(fileName: string, holidays: Holiday[], year?: number): Promise<void> {
  if (!holidays?.length) {
    return
  }

  const { gistId, gistToken } = getGistInfo()
  const yearFileName = year ? `holidays-${year}.json` : fileName
  const content = JSON.stringify(holidays, null, 2)
  await writeGistFile({ gistId, gistToken, fileName: yearFileName, content })
}

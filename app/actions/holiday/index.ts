'use server'

import { isWorkday as isWorkdayInHolidays, listHoliday } from './api'

export { listHoliday }
export type { Holiday } from './api'

/**
 * 判断指定日期是否为节假日
 * @param date 要判断的日期对象
 */
export async function isHoliday(date: Date) {
  return !(await isWorkday(date))
}

/**
 * 判断指定日期是否为工作日
 * @param date 要判断的日期对象
 */
export async function isWorkday(date: Date) {
  const holidays = await listHoliday(date.getFullYear())
  return isWorkdayInHolidays(date, holidays)
}

/**
 * 判断今天是否为工作日
 */
export async function isWorkdayToady() {
  return isWorkday(new Date())
}

/**
 * 判断明天是否为工作日
 */
export async function isWorkdayTomorrow() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isWorkday(tomorrow)
}

/**
 * 判断昨天是否为工作日
 */
export async function isWorkdayYesterday() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isWorkday(yesterday)
}

/**
 * 判断未来第N天是否为工作日
 * @param days 天数，从今天开始计算
 */
export async function isWorkdayInNextDays(days: number) {
  const nextDay = new Date()
  nextDay.setDate(nextDay.getDate() + days)
  return isWorkday(nextDay)
}

/**
 * 判断过去第N天是否为工作日
 * @param days 天数，从今天开始计算
 */
export async function isWorkdayInLastDays(days: number) {
  const lastDay = new Date()
  lastDay.setDate(lastDay.getDate() - days)
  return isWorkday(lastDay)
}

/**
 * 判断今天是否为节假日
 */
export async function isHolidayToady() {
  return !(await isWorkdayToady())
}

/**
 * 判断明天是否为节假日
 */
export async function isHolidayTomorrow() {
  return !(await isWorkdayTomorrow())
}

/**
 * 判断昨天是否为节假日
 */
export async function isHolidayYesterday() {
  return !(await isWorkdayYesterday())
}

export async function isHolidayInNextDays(days: number) {
  return !(await isWorkdayInNextDays(days))
}

export async function isHolidayInLastDays(days: number) {
  return !(await isWorkdayInLastDays(days))
}

/**
 * 获取今天的节日名称或星期几
 * @returns 节日名称或星期几（如'星期一'）
 */
export async function getTodaySpecial() {
  const today = new Date()
  const holidays = await listHoliday()
  const dateStr = today.toISOString().split('T')[0]
  const holiday = holidays.find((h) => h.date === dateStr)

  if (holiday?.isHoliday && holiday.name) {
    return holiday.name
  }

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekdays[today.getDay()]
}

/**
 * 获取下一个节日名称
 * @returns 下一个节日名称，如果没有找到则返回null
 */
export async function getNextHoliday() {
  const today = new Date()
  const holidays = await listHoliday()

  // 筛选出未来的节日
  const futureHolidays = holidays.filter((h) => {
    const holidayDate = new Date(h.date)
    return holidayDate > today && h.isHoliday && h.name
  })

  // 按日期排序
  futureHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return futureHolidays[0]?.name || null
}

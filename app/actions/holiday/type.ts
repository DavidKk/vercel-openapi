type HolidayWage = 1 | 2 | 3

interface BaseHolidayInfo {
  name: string
  date: `${number}-${number}${number}-${number}${number}`
  wage: HolidayWage
  rest?: number
}

interface Holiday extends BaseHolidayInfo {
  holiday: true
}

interface Workday extends BaseHolidayInfo {
  holiday: false
  after?: boolean
  target?: string
}

export type HolidayDetail = Holiday | Workday

export interface HolidayData {
  [date: string]: HolidayDetail
}

export interface HolidayApiResponse {
  code: number
  holiday: HolidayData
}

import type { HolidayApiResponse, HolidayData } from './type'

const CHINA_HOLIDAY_URL = Buffer.from('aHR0cHM6Ly90aW1vci50ZWNoL2FwaS9ob2xpZGF5L3llYXI=', 'base64').toString('utf-8')

/**
 * Fetch raw holiday data from the Timor data source
 * @param year - Year to fetch holiday data for
 * @returns Promise<HolidayApiResponse> - Raw holiday data response
 */
export async function fetchHolidayData(year: number = new Date().getFullYear()): Promise<HolidayApiResponse> {
  const response = await fetch(`${CHINA_HOLIDAY_URL}/${year}`)
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`)
  }

  return (await response.json()) as HolidayApiResponse
}

/**
 * Parse holiday data from API response
 * @param data - Raw holiday data from API
 * @returns HolidayData - Parsed holiday data
 */
export function parseHolidayData(data: HolidayApiResponse): HolidayData {
  if (data.code !== 0) {
    throw new Error('Invalid holiday data response')
  }

  return data.holiday
}

/**
 * Fetch and parse holiday data from the Timor data source
 * Combines fetchHolidayData and parseHolidayData
 * @param year - Year to fetch holiday data for
 * @returns Promise<HolidayData> - Parsed holiday data
 */
export async function fetchAndParseHolidayData(year: number = new Date().getFullYear()): Promise<HolidayData> {
  const rawData = await fetchHolidayData(year)
  return parseHolidayData(rawData)
}

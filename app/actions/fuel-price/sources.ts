import { createLogger } from '@/services/logger'

import type { FuelPriceData } from './types'

const FUEL_PRICE_URL = Buffer.from('aHR0cHM6Ly93d3cuYXV0b2hvbWUuY29tLmNuL29pbA==', 'base64').toString('utf-8')
const FUEL_PRICE_SCHEDULE_URL = Buffer.from('aHR0cHM6Ly93d3cueGlhb3hpb25neW91aGFvLmNvbS9mcHJpY2Uv', 'base64').toString('utf-8')

const sourceLog = createLogger('fuel-price-source')

/**
 * Fetch raw HTML data from the primary fuel price data source
 * @returns Promise<string> - HTML content
 */
export async function fetchAutohomeFuelPriceHTML() {
  sourceLog.info('primary fetch start', { source: 'autohome-oil' })
  try {
    const response = await fetch(FUEL_PRICE_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const text = await response.text()
    sourceLog.ok('primary fetch ok', { source: 'autohome-oil', bytes: text.length })
    return text
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    sourceLog.fail('primary fetch failed', {
      source: 'autohome-oil',
      name: err.name,
      message: err.message,
    })
    throw e
  }
}

/**
 * Fetch raw HTML data from the fuel price schedule source
 * This source is only used to extract the next adjustment date
 * @returns Promise<string> - HTML content
 */
export async function fetchFuelPriceScheduleHTML() {
  try {
    const response = await fetch(FUEL_PRICE_SCHEDULE_URL, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en,zh;q=0.9,zh-CN;q=0.8',
        'cache-control': 'max-age=0',
        'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error when fetching fuel price schedule! Status: ${response.status}`)
    }

    const text = await response.text()
    sourceLog.ok('schedule fetch ok', { source: 'xiaoxiongyouhao-schedule', bytes: text.length })
    return text
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    sourceLog.warn('schedule fetch failed', {
      source: 'xiaoxiongyouhao-schedule',
      name: err.name,
      message: err.message,
    })
    throw e
  }
}

/**
 * Parse the next fuel price adjustment date from schedule HTML
 * @param html HTML content to parse
 * @returns string | null - Next adjustment date string (e.g. 2026-03-24) or null if not found
 */
export function parseNextAdjustmentDate(html: string): string | null {
  // Match the "下次调价：YYYY-MM-DD" fragment in the schedule section
  const nextMatch = html.match(/下次调价：(\d{4}-\d{2}-\d{2})/)
  if (!nextMatch || !nextMatch[1]) {
    return null
  }

  return nextMatch[1]
}

/**
 * Fetch and parse the next fuel price adjustment date
 * @returns Promise<string | null> - Next adjustment date string or null if unavailable
 */
export async function fetchNextAdjustmentDate(): Promise<string | null> {
  const html = await fetchFuelPriceScheduleHTML()
  return parseNextAdjustmentDate(html)
}

/**
 * Parse fuel price data from HTML content
 * @param html - HTML content to parse
 * @returns FuelPriceData[] - Parsed fuel price data
 */
export function parseAutohomeFuelPriceData(html: string) {
  const fuelPrices: FuelPriceData[] = []
  const tableRegex = /<tbody>([\s\S]*?)<\/tbody>/
  const tbodyMatch = html.match(tableRegex)

  if (tbodyMatch && tbodyMatch[1]) {
    const tbodyContent = tbodyMatch[1]
    // Match each table row
    const rowRegex = /<tr>([\s\S]*?)<\/tr>/g
    let rowMatch

    while ((rowMatch = rowRegex.exec(tbodyContent)) !== null) {
      const rowContent = rowMatch[1]
      // Extract data from each cell
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
      const cells: string[] = []
      let cellMatch

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        // Remove HTML tags and extra whitespace
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        cells.push(cellText)
      }

      // Only add if we have enough data cells (province + 4 prices)
      if (cells.length >= 5) {
        fuelPrices.push({
          province: cells[0],
          b92: cells[1],
          b95: cells[2],
          b98: cells[3],
          b0: cells[4],
        })
      }
    }
  }

  return fuelPrices
}

/**
 * Fetch and parse fuel price data from the primary data source
 * Combines fetchAutohomeFuelPriceHTML and parseAutohomeFuelPriceData
 * @returns Promise<FuelPriceData[]> - Parsed fuel price data
 */
export async function fetchAndParseFuelPriceData() {
  const html = await fetchAutohomeFuelPriceHTML()
  const rows = parseAutohomeFuelPriceData(html)
  if (rows.length === 0) {
    sourceLog.warn('primary parse returned no rows', {
      source: 'autohome-oil',
      htmlBytes: html.length,
    })
  } else {
    sourceLog.ok('primary parse ok', { source: 'autohome-oil', provinces: rows.length })
  }
  return rows
}

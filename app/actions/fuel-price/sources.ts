import { createLogger } from '@/services/logger'

import type { FuelPriceData } from './types'

/**
 * Primary HTML source: provincial 92#/95#/0# diesel tables and next adjustment line.
 * @see https://www.xiaoxiongyouhao.com/fprice/
 */
const FUEL_PRICE_PRIMARY_URL = 'https://www.xiaoxiongyouhao.com/fprice/'

const sourceLog = createLogger('fuel-price-source')

/** Browser-like headers for the HTML document request. */
const PRIMARY_FETCH_HEADERS: HeadersInit = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'en,zh;q=0.9,zh-CN;q=0.8',
  'cache-control': 'max-age=0',
  'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
}

/**
 * Normalize text inside a table cell (strip tags, collapse whitespace).
 * @param raw Inner HTML of one `<td>`
 * @returns Plain text for that cell
 */
function stripCellInnerHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch raw HTML from the primary fuel price page (小熊油耗).
 * @returns HTML document string
 */
export async function fetchXiaoxiongyouhaoFpriceHTML(): Promise<string> {
  sourceLog.info('primary fetch start', { source: 'xiaoxiongyouhao-fprice' })
  try {
    const response = await fetch(FUEL_PRICE_PRIMARY_URL, { headers: PRIMARY_FETCH_HEADERS })
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const text = await response.text()
    sourceLog.ok('primary fetch ok', { source: 'xiaoxiongyouhao-fprice', bytes: text.length })
    return text
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    sourceLog.fail('primary fetch failed', {
      source: 'xiaoxiongyouhao-fprice',
      name: err.name,
      message: err.message,
    })
    throw e
  }
}

/**
 * Parse the next fuel price adjustment date from page HTML.
 * @param html HTML content to parse
 * @returns Next adjustment date string (YYYY-MM-DD) or null if not found
 */
export function parseNextAdjustmentDate(html: string): string | null {
  const nextMatch = html.match(/下次调价：(\d{4}-\d{2}-\d{2})/)
  if (!nextMatch || !nextMatch[1]) {
    return null
  }

  return nextMatch[1]
}

/**
 * Parse provincial fuel rows from 小熊油耗 `price-table` blocks (92#, 95#, 0#柴).
 * 98# is not listed on this page; `b98` is set to "-" for API shape compatibility.
 * @param html Full page HTML
 * @returns Parsed rows in display order
 */
export function parseXiaoxiongyouhaoFuelPriceData(html: string): FuelPriceData[] {
  const fuelPrices: FuelPriceData[] = []
  const tableRegex = /<table[^>]*class="[^"]*price-table[^"]*"[^>]*>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi
  let tableMatch

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tbodyContent = tableMatch[1]
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    let rowMatch

    while ((rowMatch = rowRegex.exec(tbodyContent)) !== null) {
      const rowHtml = rowMatch[1]
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g
      const cells: string[] = []
      let cellMatch

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push(stripCellInnerHtml(cellMatch[1]))
      }

      if (cells.length >= 4) {
        fuelPrices.push({
          province: cells[0],
          b92: cells[1],
          b95: cells[2],
          b98: '-',
          b0: cells[3],
        })
      }
    }
  }

  return fuelPrices
}

/**
 * Fetch the primary page once and return parsed provinces plus next adjustment date.
 * @returns Fuel rows and optional next adjustment date from the same HTML
 */
export async function fetchFuelPriceFromPrimarySource(): Promise<{
  data: FuelPriceData[]
  nextAdjustmentDate: string | null
}> {
  const html = await fetchXiaoxiongyouhaoFpriceHTML()
  const data = parseXiaoxiongyouhaoFuelPriceData(html)
  const nextAdjustmentDate = parseNextAdjustmentDate(html)

  if (data.length === 0) {
    sourceLog.warn('primary parse returned no rows', {
      source: 'xiaoxiongyouhao-fprice',
      htmlBytes: html.length,
    })
  } else {
    sourceLog.ok('primary parse ok', { source: 'xiaoxiongyouhao-fprice', provinces: data.length })
  }

  return { data, nextAdjustmentDate }
}

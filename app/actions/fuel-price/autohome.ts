import type { FuelPriceData } from './types'

const FUEL_PRICE_URL = Buffer.from('aHR0cHM6Ly93d3cuYXV0b2hvbWUuY29tLmNuL29pbA==', 'base64').toString('utf-8')

/**
 * Fetch raw HTML data from the primary fuel price data source
 * @returns Promise<string> - HTML content
 */
export async function fetchAutohomeFuelPriceHTML() {
  const response = await fetch(FUEL_PRICE_URL)
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`)
  }

  return await response.text()
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
  return parseAutohomeFuelPriceData(html)
}

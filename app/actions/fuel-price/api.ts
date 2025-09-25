import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'
import { fetchAndParseFuelPriceData } from './autohome'
import type { FuelPrice, FuelPriceList, ProvinceFuelPrice } from './types'
import { isFuelPrice } from './types'

interface MemoryCache {
  data: FuelPrice | null
  timestamp: number
}

/** Memory cache storage */
const MEMORY_CACHE: MemoryCache = {
  data: null,
  timestamp: 0,
}

const CACHE_DURATION = 60 * 60 * 1000
const CURRENT_FUEL_PRICE_FILE = 'current-fuel-price.json'
const PREVIOUS_FUEL_PRICE_FILE = 'previous-fuel-price.json'

/**
 * Get fuel price data by fetching and parsing data from the primary data source
 * This function can be easily replaced with another data source implementation
 * @returns Promise<FuelPrice>
 */
export async function getFuelPrice(): Promise<FuelPrice> {
  const fuelPrices = await fetchAndParseFuelPriceData()

  return {
    data: fuelPrices,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Read fuel price data from Gist cache
 * @param fileName File name to read from Gist
 */
async function readFuelPriceFromGist(fileName: string): Promise<FuelPrice | null> {
  try {
    const { gistId, gistToken } = getGistInfo()
    const content = await readGistFile({ gistId, gistToken, fileName })
    const parsedData = JSON.parse(content)

    // Check if parsed data is of correct type using the type guard
    if (isFuelPrice(parsedData)) {
      return parsedData
    }

    // Return null if data type is incorrect to trigger re-fetching
    return null
  } catch (error) {
    // Return null if file doesn't exist or other error occurred
    // This is expected as the file may not exist yet
    return null
  }
}

/**
 * Write fuel price data to Gist cache
 * @param fileName File name to write to Gist
 * @param fuelPriceData Fuel price data to write
 */
async function writeFuelPriceToGist(fileName: string, fuelPriceData: FuelPrice) {
  try {
    const { gistId, gistToken } = getGistInfo()
    const content = JSON.stringify(fuelPriceData, null, 2)
    await writeGistFile({ gistId, gistToken, fileName, content })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to write fuel price data to Gist file ${fileName}:`, error)
  }
}

/**
 * Compare two fuel price datasets to check if they are different
 * @param current Current fuel price data
 * @param previous Previous fuel price data
 * @returns boolean True if prices are different, false otherwise
 */
function hasFuelPriceChanged(current: FuelPrice, previous: FuelPrice | null): boolean {
  if (!previous) {
    return true
  }

  // Compare the data arrays
  if (current.data.length !== previous.data.length) {
    return true
  }

  // Compare each province's prices
  for (let i = 0; i < current.data.length; i++) {
    const currentCity = current.data[i]
    const previousCity = previous.data[i]

    if (
      currentCity.province !== previousCity.province ||
      currentCity.b92 !== previousCity.b92 ||
      currentCity.b95 !== previousCity.b95 ||
      currentCity.b98 !== previousCity.b98 ||
      currentCity.b0 !== previousCity.b0
    ) {
      return true
    }
  }

  return false
}

/**
 * Get fuel price data with caching and Gist persistence
 * @returns Promise<FuelPriceList> - Contains previous and current fuel price data arrays with timestamps
 */
export async function getCachedFuelPrice(): Promise<FuelPriceList> {
  const now = Date.now()
  if (MEMORY_CACHE.data && now - MEMORY_CACHE.timestamp < CACHE_DURATION) {
    return {
      previous: [],
      current: MEMORY_CACHE.data.data,
      latestUpdated: now,
      previousUpdated: 0,
    }
  }

  const previousData = await readFuelPriceFromGist(PREVIOUS_FUEL_PRICE_FILE)
  const currentData = await readFuelPriceFromGist(CURRENT_FUEL_PRICE_FILE)

  if (currentData && now - new Date(currentData.lastUpdated).getTime() < CACHE_DURATION) {
    MEMORY_CACHE.data = currentData
    MEMORY_CACHE.timestamp = now

    return {
      previous: previousData ? previousData.data : [],
      current: currentData.data,
      latestUpdated: new Date(currentData.lastUpdated).getTime(),
      previousUpdated: previousData ? new Date(previousData.lastUpdated).getTime() : 0,
    }
  }

  const freshData = await getFuelPrice()
  if (hasFuelPriceChanged(freshData, currentData)) {
    if (currentData) {
      await writeFuelPriceToGist(PREVIOUS_FUEL_PRICE_FILE, currentData)
    }

    await writeFuelPriceToGist(CURRENT_FUEL_PRICE_FILE, freshData)
  }

  MEMORY_CACHE.data = freshData
  MEMORY_CACHE.timestamp = now

  return {
    previous: currentData ? currentData.data : [],
    current: freshData.data,
    latestUpdated: new Date(freshData.lastUpdated).getTime(),
    previousUpdated: currentData ? new Date(currentData.lastUpdated).getTime() : 0,
  }
}

/**
 * Get fuel price data for a specific province with caching
 * @param province The province name to get fuel price data for
 * @returns Promise<ProvinceFuelPrice> - Contains previous and current fuel price data for the specified province
 */
export async function getCachedProvinceFuelPrice(province: string): Promise<ProvinceFuelPrice> {
  // First get all cached fuel price data
  const fuelPriceData = await getCachedFuelPrice()

  // Filter data for the specific province from both current and previous data
  const currentProvinceData = fuelPriceData.current.find((item) => item.province === province)
  const previousProvinceData = fuelPriceData.previous.find((item) => item.province === province) || null

  // Return the province-specific data with timestamps
  return {
    previous: previousProvinceData || null,
    current: currentProvinceData || null,
    latestUpdated: fuelPriceData.latestUpdated,
    previousUpdated: fuelPriceData.previousUpdated,
  }
}

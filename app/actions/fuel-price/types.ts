export interface FuelPriceData {
  province: string // City name
  b92: string // 92# gasoline price
  b95: string // 95# gasoline price
  b98: string // 98# gasoline price
  b0: string // 0# diesel price
}

/**
 * Type guard to check if an object is of type FuelPriceData
 * @param obj The object to check
 * @returns boolean True if the object is of type FuelPriceData, false otherwise
 */
export function isFuelPriceData(obj: any): obj is FuelPriceData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.province === 'string' &&
    typeof obj.b92 === 'string' &&
    typeof obj.b95 === 'string' &&
    typeof obj.b98 === 'string' &&
    typeof obj.b0 === 'string'
  )
}

// 燃油类型定义
export const FUEL_TYPES = ['b92', 'b95', 'b98', 'b0'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

/**
 * Check if a string is a valid fuel type
 * @param fuelType The fuel type to check
 * @returns boolean True if the fuel type is valid, false otherwise
 */
export function isFuelType(fuelType: string): fuelType is FuelType {
  return FUEL_TYPES.includes(fuelType as FuelType)
}

// Define response structure
export interface FuelPrice {
  data: FuelPriceData[]
  lastUpdated: string
}

/**
 * Type guard to check if an object is of type FuelPrice
 * @param obj The object to check
 * @returns boolean True if the object is of type FuelPrice, false otherwise
 */
export function isFuelPrice(obj: any): obj is FuelPrice {
  return obj !== null && typeof obj === 'object' && Array.isArray(obj.data) && typeof obj.lastUpdated === 'string' && obj.data.every(isFuelPriceData)
}

// Define structure for fuel price history
export interface FuelPriceHistory {
  previous: FuelPrice | null
  current: FuelPrice
}

// Define structure for simplified fuel price response
export interface FuelPriceList {
  previous: FuelPriceData[]
  current: FuelPriceData[]
  latestUpdated: number
  previousUpdated: number
}

/**
 * Type guard to check if an object is of type FuelPriceList
 * @param obj The object to check
 * @returns boolean True if the object is of type FuelPriceList, false otherwise
 */
export function isFuelPriceList(obj: any): obj is FuelPriceList {
  if (obj === null || typeof obj !== 'object') {
    return false
  }

  // Check if required properties exist and have correct types
  return (
    Array.isArray(obj.previous) &&
    Array.isArray(obj.current) &&
    typeof obj.latestUpdated === 'number' &&
    typeof obj.previousUpdated === 'number' &&
    obj.previous.every(isFuelPriceData) &&
    obj.current.every(isFuelPriceData)
  )
}

// Define structure for province-specific fuel price response
export interface ProvinceFuelPrice {
  previous: FuelPriceData | null
  current: FuelPriceData | null
  latestUpdated: number
  previousUpdated: number
}

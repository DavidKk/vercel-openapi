'use client'

import { MapPinIcon } from '@heroicons/react/24/solid'
import { useMemo, useState } from 'react'

import type { FuelPriceData, FuelPriceList } from '@/app/actions/fuel-price/types'
import { Spinner } from '@/components/Spinner'
import { useLocation } from '@/hooks/useLocation'

/**
 * Props for the FuelPriceTable component
 */
export interface FuelPriceTableProps {
  /** Fuel price data to display */
  fuelPrices: FuelPriceList | null
}

/**
 * Fuel price table component that displays fuel prices for Chinese provinces
 * Highlights the user's location and shows price changes over time
 */
export function FuelPriceTable({ fuelPrices }: FuelPriceTableProps) {
  const { province: userProvinceInfo, loading: loadingLocation } = useLocation()
  const userProvince = userProvinceInfo?.chinese || null

  // State for sorting - now includes 'none' for default order
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' | 'none' } | null>(null)

  // If no data, show loading spinner
  if (!fuelPrices) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    )
  }

  // Create a map of previous prices for quick lookup
  const previousPricesMap = new Map()
  fuelPrices.previous.forEach((item) => {
    previousPricesMap.set(item.province, item)
  })

  // Format timestamps for display
  const latestUpdated = new Date(fuelPrices.latestUpdated).toLocaleString()
  const previousUpdated = fuelPrices.previousUpdated ? new Date(fuelPrices.previousUpdated).toLocaleString() : null

  // Separate user's province from the rest of the data
  let userProvinceData = null
  let otherProvincesData = [...fuelPrices.current]

  if (userProvince) {
    const userIndex = otherProvincesData.findIndex((item) => item.province === userProvince)

    if (userIndex !== -1) {
      userProvinceData = otherProvincesData[userIndex]
      otherProvincesData.splice(userIndex, 1)
    }
  }

  // Combine user province data with other provinces data
  const allProvincesData = userProvinceData ? [userProvinceData, ...otherProvincesData] : otherProvincesData

  // Sort data based on sort configuration
  const sortedData = useMemo(() => {
    // If no sort config or direction is 'none', return original order with user province first
    if (!sortConfig || sortConfig.direction === 'none') {
      return allProvincesData
    }

    return [...allProvincesData].sort((a, b) => {
      // Extract numeric values for comparison
      const aValue = parseFloat(a[sortConfig.key as keyof FuelPriceData].replace(/[^\d.]/g, ''))
      const bValue = parseFloat(b[sortConfig.key as keyof FuelPriceData].replace(/[^\d.]/g, ''))

      // Handle invalid numbers
      if (isNaN(aValue) && isNaN(bValue)) return 0
      if (isNaN(aValue)) return 1
      if (isNaN(bValue)) return -1

      if (sortConfig.direction === 'ascending') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }, [allProvincesData, sortConfig])

  // Handle sorting request - cycle through none -> ascending -> descending -> none
  const requestSort = (key: string) => {
    let direction: 'none' | 'ascending' | 'descending' = 'none'

    if (!sortConfig || sortConfig.key !== key) {
      // First click on a column - start with ascending
      direction = 'ascending'
    } else if (sortConfig.direction === 'none') {
      // Second click - ascending
      direction = 'ascending'
    } else if (sortConfig.direction === 'ascending') {
      // Third click - descending
      direction = 'descending'
    }
    // Fourth click would go back to 'none' (default)

    setSortConfig({ key, direction })
  }

  // Get sort indicator for column
  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null
    }

    switch (sortConfig.direction) {
      case 'ascending':
        return '↑'
      case 'descending':
        return '↓'
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">China Fuel Prices</h1>
        <p className="text-gray-600">Latest gasoline and diesel prices across Chinese cities</p>
        <div className="mt-2">
          <span className="inline-flex items-center mr-4">
            <span className="text-red-500">▲</span>
            <span className="ml-1 text-sm">Price increased</span>
          </span>
          <span className="inline-flex items-center">
            <span className="text-green-500">▼</span>
            <span className="ml-1 text-sm">Price decreased</span>
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">Last updated: {latestUpdated}</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('province')}
                >
                  <div className="flex items-center">
                    City
                    {getSortIndicator('province') && <span className="ml-1">{getSortIndicator('province')}</span>}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('b92')}>
                  <div className="flex items-center">
                    92# Gasoline
                    {getSortIndicator('b92') && <span className="ml-1">{getSortIndicator('b92')}</span>}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('b95')}>
                  <div className="flex items-center">
                    95# Gasoline
                    {getSortIndicator('b95') && <span className="ml-1">{getSortIndicator('b95')}</span>}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('b98')}>
                  <div className="flex items-center">
                    98# Gasoline
                    {getSortIndicator('b98') && <span className="ml-1">{getSortIndicator('b98')}</span>}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort('b0')}>
                  <div className="flex items-center">
                    0# Diesel
                    {getSortIndicator('b0') && <span className="ml-1">{getSortIndicator('b0')}</span>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => {
                const previousItem = previousPricesMap.get(item.province)
                const isUserProvince = userProvinceData && item.province === userProvinceData.province

                return (
                  <tr
                    key={index}
                    className={`
                      ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      ${isUserProvince ? 'bg-blue-50 font-bold' : ''}
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {item.province}
                        {isUserProvince && <MapPinIcon className="h-4 w-4 ml-2 text-red-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPriceWithChange(item.b92, previousItem?.b92)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPriceWithChange(item.b95, previousItem?.b95)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPriceWithChange(item.b98, previousItem?.b98)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPriceWithChange(item.b0, previousItem?.b0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 显示价格变化历史 */}
      {fuelPrices.previous.length > 0 && previousUpdated && (
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Price Change History</h2>
          <p className="text-gray-600 mb-4">Previous update: {previousUpdated}</p>
          <div className="text-sm text-gray-500">
            <p>Note: Only showing data when prices have changed.</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to compare prices and determine if there's an increase or decrease
 * @param currentPrice Current price string
 * @param previousPrice Previous price string
 * @returns React element with price change indicator or null
 */
function getPriceChangeIndicator(currentPrice: string, previousPrice: string | undefined) {
  if (!previousPrice) {
    return null
  }

  // Remove any non-numeric characters except decimal point
  const current = parseFloat(currentPrice.replace(/[^\d.]/g, ''))
  const previous = parseFloat(previousPrice.replace(/[^\d.]/g, ''))

  if (isNaN(current) || isNaN(previous)) {
    return null
  }

  if (current > previous) {
    return <span className="ml-1 text-red-500">▲</span>
  }

  if (current < previous) {
    return <span className="ml-1 text-green-500">▼</span>
  }

  return null
}

/**
 * Helper function to calculate price change amount
 * @param currentPrice Current price string
 * @param previousPrice Previous price string
 * @returns Price change amount or null
 */
function getPriceChangeAmount(currentPrice: string, previousPrice: string | undefined): string | null {
  if (!previousPrice) {
    return null
  }

  // Remove any non-numeric characters except decimal point
  const current = parseFloat(currentPrice.replace(/[^\d.]/g, ''))
  const previous = parseFloat(previousPrice.replace(/[^\d.]/g, ''))

  if (isNaN(current) || isNaN(previous)) {
    return null
  }

  const change = current - previous
  return change.toFixed(2)
}

/**
 * Helper function to format price with change indicator
 * @param currentPrice Current price string
 * @param previousPrice Previous price string
 * @returns React element with formatted price and change indicator
 */
function formatPriceWithChange(currentPrice: string, previousPrice?: string) {
  // Check if price is valid (not zero or empty)
  const cleanPrice = currentPrice.replace(/[^\d.]/g, '')
  const price = parseFloat(cleanPrice)

  // If price is invalid or zero, show "-"
  if (isNaN(price) || price === 0) {
    return <span>-</span>
  }

  const changeAmount = getPriceChangeAmount(currentPrice, previousPrice)

  return (
    <span>
      {currentPrice}
      {changeAmount && changeAmount !== '0.00' && (
        <sup className="text-xs ml-1">
          {parseFloat(changeAmount) > 0 ? (
            <span className="text-red-500">+{changeAmount}</span>
          ) : (
            <span className="text-green-500">{changeAmount}</span>
          )}
        </sup>
      )}
    </span>
  )
}

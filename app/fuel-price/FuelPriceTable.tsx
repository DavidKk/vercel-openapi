'use client'

import type { FuelPriceList } from '@/app/actions/fuel-price/types'
import { Spinner } from '@/components/Spinner'

export interface FuelPriceTableProps {
  fuelPrices: FuelPriceList | null
}

export function FuelPriceTable({ fuelPrices }: FuelPriceTableProps) {
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">92# Gasoline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">95# Gasoline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">98# Gasoline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">0# Diesel</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fuelPrices.current.map((item, index) => {
                const previousItem = previousPricesMap.get(item.province)
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.province}</td>
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

// Helper function to compare prices and determine if there's an increase or decrease
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

// Helper function to format price with change indicator
function formatPriceWithChange(currentPrice: string, previousPrice?: string) {
  // Check if price is valid (not zero or empty)
  const cleanPrice = currentPrice.replace(/[^\d.]/g, '')
  const price = parseFloat(cleanPrice)

  // If price is invalid or zero, show "-"
  if (isNaN(price) || price === 0) {
    return <span>-</span>
  }

  return (
    <span>
      {currentPrice}
      {getPriceChangeIndicator(currentPrice, previousPrice)}
    </span>
  )
}

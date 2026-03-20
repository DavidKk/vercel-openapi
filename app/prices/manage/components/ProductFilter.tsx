'use client'

import { useEffect, useState } from 'react'
import { TbBackspace } from 'react-icons/tb'

interface ProductFilterProps {
  onFilterChange: (filterText: string) => void
  placeholder?: string
}

/**
 * Product list filter input.
 * @param props Filter props
 * @returns Filter component
 */
export function ProductFilter({ onFilterChange, placeholder = 'Filter products...' }: Readonly<ProductFilterProps>) {
  const [filterText, setFilterText] = useState('')

  useEffect(() => {
    onFilterChange(filterText)
  }, [filterText, onFilterChange])

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-900 outline-none transition-colors focus:outline-none focus:border-gray-500"
        value={filterText}
        onChange={(event) => setFilterText(event.target.value)}
      />
      {filterText ? (
        <button
          type="button"
          onClick={() => setFilterText('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          aria-label="Clear filter"
        >
          <TbBackspace className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

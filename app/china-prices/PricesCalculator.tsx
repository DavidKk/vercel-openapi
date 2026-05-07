'use client'

import classNames from 'classnames'
import { useMemo, useRef, useState } from 'react'
import { TbBackspace } from 'react-icons/tb'

import type { ProductType } from '@/app/actions/prices/product'
import SearchableSelect from '@/components/SearchableSelect'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import { formatNumberWithCommas, parseFormattedNumber, parseUnit } from '@/utils/format'
import { formatNumber } from '@/utils/formatNumber'
import { calculateMathExpression } from '@/utils/mathExpression'
import { getPriceLevelText } from '@/utils/price/calculatePriceLevel'
import { calculateProductComparisons } from '@/utils/price/calculateProductComparisons'

interface PricesCalculatorProps {
  products: ProductType[]
}

interface NumberInputProps {
  value: string
  unit: string
  placeholder: string
  supportFormula?: boolean
  suggestions?: string[]
  onChange: (value: string, numericValue: number) => void
}

function NumberInput(props: Readonly<NumberInputProps>) {
  const { value, unit, placeholder, supportFormula = false, suggestions = [], onChange } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const isFormula = value.startsWith('=')
  const displayValue = isFormula ? value.substring(1) : value

  function handleChange(nextInputValue: string) {
    if (supportFormula && nextInputValue.includes('=')) {
      const withoutEquals = nextInputValue.replace(/=/g, '')
      onChange(`=${withoutEquals}`, 0)
      return
    }

    if (supportFormula && isFormula) {
      onChange(`=${nextInputValue}`, 0)
      return
    }

    const numericValue = parseFormattedNumber(nextInputValue)
    const dotMatch = nextInputValue.match(/\.+$/)
    let formattedValue = formatNumberWithCommas(nextInputValue)
    if (dotMatch && !formattedValue.endsWith('.')) {
      formattedValue += '.'
    }
    onChange(formattedValue, numericValue)
  }

  function handleBlur() {
    if (isFormula) {
      const result = calculateMathExpression(displayValue.trim())
      if (!Number.isNaN(result)) {
        const formatted = formatNumberWithCommas(String(result))
        onChange(formatted, result)
      }
    }
    setTimeout(() => setShowSuggestions(false), 150)
  }

  function handleSuggestionSelect(nextValue: string) {
    onChange(nextValue, nextValue.startsWith('=') ? 0 : parseFormattedNumber(nextValue))
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative flex flex-col">
      <div className="flex h-12 w-full items-center rounded-lg border border-gray-300 bg-white">
        {isFormula && (
          <div className="flex h-12 min-w-6 flex-shrink-0 items-center justify-center pl-3">
            <span className="inline-block select-none text-base text-gray-400">=</span>
          </div>
        )}
        <div className="relative h-full flex-1">
          <input
            ref={inputRef}
            className={classNames('h-full w-full border-0 bg-transparent px-3 py-0 text-base text-gray-900 focus:outline-none', {
              'text-left': isFormula,
              'text-right': !isFormula,
            })}
            value={displayValue}
            placeholder={placeholder}
            onChange={(event) => handleChange(event.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
          />
        </div>
        {!isFormula && (
          <div className="flex h-12 min-w-6 flex-shrink-0 items-center justify-center pr-3">
            <span className="select-none text-base text-gray-500">{unit}</span>
          </div>
        )}
      </div>
      {showSuggestions && supportFormula && suggestions.length > 0 && (
        <div className="absolute top-[calc(100%+2px)] z-10 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="py-1">
            {suggestions.map((suggestion, index) => (
              <li key={`${suggestion}-${index}`} className="cursor-pointer px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => handleSuggestionSelect(suggestion)}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Prices overview with the same interactive flow as calc:
 * select product -> input total price/quantity (supports formula) -> view comparisons.
 * @param props Calculator props
 * @returns Calculator panel
 */
export function PricesCalculator(props: Readonly<PricesCalculatorProps>) {
  const { products } = props
  const [totalPrice, setTotalPrice] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')

  const productNames = useMemo(() => Array.from(new Set(products.map((item) => item.name))), [products])
  const productOptions = useMemo(() => productNames.map((name) => ({ label: name, value: name })), [productNames])
  const defaultProductName = productNames[0] ?? ''
  const [selectedProductName, setSelectedProductName] = useLocalStorageState('prices-product-name', defaultProductName)
  const selectedProducts = useMemo(() => products.filter((item) => item.name === selectedProductName), [products, selectedProductName])
  const selectedProduct = selectedProducts[0] ?? null
  const selectedUnit = selectedProduct?.unit ?? ''
  const comparisons = useMemo(() => calculateProductComparisons(totalPrice, totalQuantity, selectedProducts), [totalPrice, totalQuantity, selectedProducts])

  const quantitySuggestions = useMemo(() => {
    const numeric = parseFormattedNumber(totalQuantity)
    const baseValue = Number.isFinite(numeric) && numeric > 0 ? numeric : 1
    const unitParsed = parseUnit(selectedUnit)
    const custom = Array.from(new Set(selectedProducts.flatMap((item) => item.unitConversions ?? [])))
    const normalizedCustom = custom.map((conversion) => `= ${conversion.replace(/^\d[\d,.]*/, String(baseValue))}`)
    const preset = unitParsed.unit ? [`= ${baseValue} ${unitParsed.unit}`, `= ${baseValue} / 2 ${unitParsed.unit}`, `= ${baseValue} * 2 ${unitParsed.unit}`] : []
    return [...normalizedCustom, ...preset].slice(0, 6)
  }, [selectedProducts, selectedUnit, totalQuantity])

  function clearAll() {
    setTotalPrice('')
    setTotalQuantity('')
  }

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-gray-50 to-white p-3 md:p-4">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-xl flex-col gap-3">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <SearchableSelect
                className="flex-1"
                value={selectedProductName}
                options={productOptions}
                onChange={(value) => setSelectedProductName(value)}
                clearable={false}
                size="md"
              />
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-100"
                onClick={() => {
                  clearAll()
                }}
                title="Clear"
              >
                <TbBackspace className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <NumberInput value={totalPrice} unit="¥" placeholder="Total Price" onChange={(value) => setTotalPrice(value)} />
              <NumberInput
                value={totalQuantity}
                unit={selectedUnit || 'Unit'}
                placeholder="Total Quantity (supports = formula)"
                supportFormula={true}
                suggestions={quantitySuggestions}
                onChange={(value) => setTotalQuantity(value)}
              />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            {selectedProduct == null ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">Please select a product</div>
            ) : comparisons.length > 0 ? (
              <div className="flex h-full flex-col gap-2 overflow-auto">
                {comparisons.map((item, index) => (
                  <div
                    key={`${item.product.id}-${index}`}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product.name}
                        {item.product.brand && <span className="ml-1 text-xs font-normal text-gray-500">- {item.product.brand}</span>}
                      </div>
                      <div className="text-sm text-gray-700">
                        {formatNumber(item.unitCurrentPrice, { maxFractionDigits: 4 })} / {item.product.unit}
                      </div>
                      <div className="text-xs text-gray-500">
                        BEST {formatNumber(item.product.unitBestPrice, { maxFractionDigits: 4 })} / {item.product.unit}
                      </div>
                    </div>
                    <div
                      className={classNames('rounded-md px-2 py-1 text-xs font-semibold', {
                        'bg-blue-50 text-blue-700 ring-1 ring-blue-100': item.level === 'excellent',
                        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100': item.level === 'good',
                        'bg-gray-100 text-gray-700 ring-1 ring-gray-200': item.level === 'acceptable',
                        'bg-amber-50 text-amber-700 ring-1 ring-amber-100': item.level === 'high',
                        'bg-orange-50 text-orange-700 ring-1 ring-orange-100': item.level === 'expensive',
                        'bg-rose-50 text-rose-700 ring-1 ring-rose-100': item.level === 'very_expensive',
                      })}
                    >
                      {getPriceLevelText(item.level)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <div className="text-sm font-medium text-gray-800">{selectedProduct.name}</div>
                <div className="text-sm text-gray-600">
                  {formatNumber(selectedProduct.unitBestPrice, { maxFractionDigits: 4 })} / {selectedProduct.unit}
                </div>
                {selectedProduct.remark && <div className="text-xs text-gray-500">{selectedProduct.remark}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

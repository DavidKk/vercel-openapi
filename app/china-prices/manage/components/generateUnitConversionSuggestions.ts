import type { ProductType } from '@/app/actions/prices/product'
import { formatNumber, parseUnit, parseUnitConversion } from '@/utils/format'

import type { SuggestionOption } from './ProductFormInput'

/**
 * Generates conversion suggestions from existing product conversions.
 * @param unit Current unit
 * @param products Product list
 * @returns Suggestion options
 */
export function generateUnitConversionSuggestions(unit: string, products: ProductType[]): SuggestionOption[] {
  if (!unit) {
    return []
  }
  const parsedCurrent = parseUnit(unit)
  const currentUnitNumber = parsedCurrent.number
  const currentUnit = parsedCurrent.unit || unit
  if (!currentUnit) {
    return []
  }

  const suggestionsMap = new Map<string, string>()
  products.forEach((product) => {
    if (!product.unitConversions?.length) {
      return
    }
    const baseParsed = parseUnit(product.unit)
    const baseUnit = baseParsed.unit || product.unit
    const baseNumber = baseParsed.number

    product.unitConversions.forEach((conversionStr) => {
      const parsed = parseUnitConversion(conversionStr)
      if (!(parsed.unit && baseUnit)) {
        return
      }

      if (baseUnit === currentUnit && baseNumber > 0) {
        const nextNumber = (parsed.number * currentUnitNumber) / baseNumber
        const labelNumber = formatNumber(nextNumber, 6)
        const productInfo = product.brand ? `${product.name} - ${product.brand}` : product.name
        const label = `${labelNumber} ${parsed.unit} (${productInfo})`
        suggestionsMap.set(label, label)
      }

      if (parsed.unit === currentUnit && parsed.number > 0) {
        const nextNumber = (baseNumber * currentUnitNumber) / parsed.number
        const labelNumber = formatNumber(nextNumber, 6)
        const productInfo = product.brand ? `${product.name} - ${product.brand}` : product.name
        const label = `${labelNumber} ${baseUnit} (${productInfo})`
        suggestionsMap.set(label, label)
      }
    })
  })

  return Array.from(suggestionsMap.values())
    .map((value) => ({ label: value, value }))
    .filter((item) => {
      try {
        const unitPart = item.value.split(' (')[0]
        const parsed = parseUnitConversion(unitPart)
        return Boolean(parsed.unit) && parsed.number > 0
      } catch {
        return false
      }
    })
}

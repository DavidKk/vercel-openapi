import type { ProductType } from '@/app/actions/prices/product'
import { parseFormattedNumber, parseUnit } from '@/utils/format'
import { calculateMathExpression } from '@/utils/mathExpression'

import { calculatePriceLevel, type PriceLevel } from './calculatePriceLevel'
import { batchProcessUnitConversionNumericPart } from './processUnitConversionNumericPart'

export interface PriceComparison {
  product: ProductType
  quantity: number
  unitCurrentPrice: number
  level: PriceLevel
}

const COMMON_FORMULAS: Array<[string, string]> = [
  ['斤', '= 500 g'],
  ['kg', '= 1000 g'],
  ['L', '= 1000 ml'],
]

function isFormula(value: string): boolean {
  return value.trim().startsWith('=')
}

function safeDivide(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return 0
  }
  return a / b
}

function parseFormulaQuantity(formulaInput: string): { value: number; unit: string } {
  const formula = formulaInput.trim().replace(/^=\s*/, '')
  const matched = formula.match(/^(.+?)\s+([A-Za-z\u4e00-\u9fa5]+)$/u)
  if (!matched) {
    return { value: calculateMathExpression(formula), unit: '' }
  }

  const numeric = calculateMathExpression(matched[1])
  return { value: numeric, unit: matched[2] }
}

/**
 * Computes unit-price comparisons for products with same category.
 * @param totalPrice Total paid price text
 * @param totalQuantity Total quantity text
 * @param products Products under same product type
 * @returns Comparison rows
 */
export function calculateProductComparisons(totalPrice: string, totalQuantity: string, products: ProductType[]): PriceComparison[] {
  const numericPrice = parseFormattedNumber(totalPrice)
  const isFormulaQuantity = isFormula(totalQuantity)
  const quantityValue = isFormulaQuantity ? 0 : parseFormattedNumber(totalQuantity)
  if (numericPrice <= 0 || (!isFormulaQuantity && quantityValue <= 0)) {
    return []
  }

  return products.map((product) => {
    const unitInfo = parseUnit(product.unit)
    let normalizedQuantity = unitInfo.number > 0 ? quantityValue / unitInfo.number : quantityValue
    if (isFormulaQuantity) {
      const parsed = parseFormulaQuantity(totalQuantity)
      const formulaConversions = COMMON_FORMULAS.filter(([sourceUnit]) => sourceUnit === unitInfo.unit).map(([, formula]) => formula.replace(/^=\s*/, ''))
      const customConversions = product.unitConversions ?? []
      const merged = batchProcessUnitConversionNumericPart(product.unit, [...customConversions, ...formulaConversions])
      const matched = merged.find((conversion) => conversion.includes(parsed.unit))
      if (matched) {
        const conversionUnit = parseUnit(matched)
        normalizedQuantity = safeDivide(parsed.value, conversionUnit.number > 0 ? conversionUnit.number : 1)
      } else {
        normalizedQuantity = parsed.value
      }
    }

    const unitCurrentPrice = normalizedQuantity > 0 ? numericPrice / normalizedQuantity : 0
    return {
      product,
      quantity: normalizedQuantity,
      unitCurrentPrice,
      level: calculatePriceLevel(unitCurrentPrice, product.unitBestPrice),
    }
  })
}

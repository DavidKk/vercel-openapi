import { COMMON_FORMULAS } from '@/app/prices/constants/formulas'
import { parseUnit, parseUnitConversion } from '@/utils/format'
import { validateUnitConversion } from '@/utils/validation'

/**
 * Builds validator that blocks conversion formulas already provided by common formulas.
 * @param currentUnit Current product unit
 * @returns Validator function
 */
export function createProductUnitConversionValidator(currentUnit: string) {
  const formulaTargetUnits = new Set<string>()

  COMMON_FORMULAS.forEach(([sourceUnit, formula]) => {
    if (sourceUnit !== currentUnit) {
      return
    }
    const parsed = parseUnit(formula.substring(1).trim())
    if (parsed.unit) {
      formulaTargetUnits.add(parsed.unit)
    }
  })

  return (value: string): true | string => {
    const formatResult = validateUnitConversion(value)
    if (formatResult !== true) {
      return formatResult
    }
    const parsed = parseUnitConversion(value)
    if (formulaTargetUnits.has(parsed.unit)) {
      return `The conversion to "${parsed.unit}" already exists in common formulas.`
    }
    return true
  }
}

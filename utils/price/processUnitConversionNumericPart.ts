import { parseUnit } from '@/utils/format'

/**
 * Adjust conversion ratio when base unit has numeric prefix.
 * @param unit Base unit string
 * @param conversion Conversion expression string
 * @returns Adjusted conversion string
 */
export function processUnitConversionNumericPart(unit: string, conversion: string): string {
  const parsedBaseUnit = parseUnit(unit)
  const baseNumber = parsedBaseUnit.number
  if (baseNumber === 1 || Number.isNaN(baseNumber)) {
    return conversion
  }

  const parsedConversion = parseUnit(conversion)
  const conversionNumber = parsedConversion.number
  const conversionUnit = parsedConversion.unit
  const adjustedNumber = conversionNumber * baseNumber
  return `${adjustedNumber} ${conversionUnit}`
}

/**
 * Batch adjust conversion list for a unit.
 * @param baseUnit Base unit text
 * @param conversions Conversion list
 * @returns Adjusted conversion list
 */
export function batchProcessUnitConversionNumericPart(baseUnit: string, conversions: string[]): string[] {
  return conversions.map((conversion) => processUnitConversionNumericPart(baseUnit, conversion))
}

/**
 * Formats value with thousands separators.
 * @param value Number or numeric string
 * @returns Formatted string
 */
export function formatNumberWithCommas(value: string | number): string {
  if (value === '' || value === null || value === undefined) {
    return ''
  }
  const numeric = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''))
  if (!Number.isFinite(numeric)) {
    return ''
  }
  return numeric.toLocaleString('en-US')
}

/**
 * Parses formatted number text to number.
 * @param value Numeric text
 * @returns Parsed number or 0
 */
export function parseFormattedNumber(value: string): number {
  if (!value) {
    return 0
  }
  const numeric = parseFloat(value.replace(/,/g, '').trim())
  return Number.isFinite(numeric) ? numeric : 0
}

/**
 * Parses unit string to number + unit.
 * @param unit Unit text like "100 g" or "ml"
 * @returns Unit descriptor
 */
export function parseUnit(unit: string): { number: number; unit: string } {
  const trimmed = unit.trim()
  if (!trimmed) {
    return { number: 1, unit: '' }
  }

  const matched = trimmed.match(/^([\d,.]+)\s*([A-Za-z\u4e00-\u9fa5]+)$/u)
  if (!matched) {
    return { number: 1, unit: trimmed }
  }

  const parsed = parseFormattedNumber(matched[1])
  return {
    number: parsed > 0 ? parsed : 1,
    unit: matched[2],
  }
}

/**
 * Parses unit conversion value.
 * @param conversion Conversion text
 * @returns Parsed conversion number and unit
 */
export function parseUnitConversion(conversion: string): { number: number; unit: string } {
  return parseUnit(conversion)
}

/**
 * Formats number with trimmed decimal precision.
 * @param num Number value
 * @param maxDecimals Maximum decimal places
 * @returns Formatted numeric string
 */
export function formatNumber(num: number, maxDecimals = 6): string {
  if (!Number.isFinite(num)) {
    return '0'
  }
  const rounded = Math.round(num * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals)
  const asString = rounded.toString()
  return asString.includes('.') ? asString.replace(/\.?0+$/, '') : asString
}

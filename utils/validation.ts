/**
 * Validates product unit format.
 * @param unit Unit text
 * @returns True when valid, otherwise error message
 */
export function validateUnit(unit: string): true | string {
  const trimmed = unit.trim()
  if (!trimmed) {
    return 'Unit is required'
  }

  const matched = /^([\d,.]+)?\s*([A-Za-z\u4e00-\u9fa5]+)$/u.test(trimmed)
  if (!matched) {
    return 'Invalid unit format'
  }

  return true
}

/**
 * Validates product name.
 * @param value Product name
 * @returns True when valid, otherwise error message
 */
export function validateProductName(value: string): true | string {
  if (!value.trim()) {
    return 'Product name is required'
  }
  if (value.trim().length > 80) {
    return 'Product name is too long'
  }
  return true
}

/**
 * Validates unit price value.
 * @param value Unit price text
 * @returns True when valid, otherwise error message
 */
export function validateProductUnitPrice(value: string): true | string {
  if (!value.trim()) {
    return 'Unit price is required'
  }
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) {
    return 'Please enter a valid price'
  }
  return true
}

/**
 * Validates remark text.
 * @param value Remark text
 * @returns True when valid, otherwise error message
 */
export function validateRemark(value: string): true | string {
  if (value.length > 200) {
    return 'Remark is too long'
  }
  return true
}

/**
 * Validates unit conversion format.
 * @param value Conversion text
 * @returns True when valid, otherwise error message
 */
export function validateUnitConversion(value: string): true | string {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }
  const matched = /^([\d,.]+)\s*([A-Za-z\u4e00-\u9fa5]+)$/u.test(trimmed)
  if (!matched) {
    return 'Unit conversion must be number + unit (e.g. 100ml or 100 ml)'
  }
  return true
}

import type { QueryType } from './types'

/**
 * Map DNS type code (RFC 1035) to string label.
 * @param type Numeric type (e.g. 1 = A, 28 = AAAA)
 * @returns Type string (e.g. 'A', 'AAAA')
 */
export function stringifyDNSType(type: number): string {
  switch (type) {
    case 1:
      return 'A'
    case 28:
      return 'AAAA'
    case 5:
      return 'CNAME'
    case 15:
      return 'MX'
    case 16:
      return 'TXT'
    default:
      return `TYPE${type}`
  }
}

/**
 * Check if value is a valid QueryType for this module.
 * @param value String to check
 * @returns True if 'A' or 'AAAA'
 */
export function isQueryType(value: string): value is QueryType {
  return value === 'A' || value === 'AAAA'
}

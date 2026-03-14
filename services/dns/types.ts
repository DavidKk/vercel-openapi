/**
 * DNS record as returned by DoH response parsing.
 */
export interface DNSRecord {
  name: string
  type: string
  ttl: number
  data: string
}

/**
 * Supported query types for minimal DNS lookup (A and AAAA).
 */
export type QueryType = 'A' | 'AAAA'

import type { DNSRecord } from '@/services/dns'

/**
 * Single DNS query result: domain, DNS server used, and resolved records.
 */
export interface DnsResult {
  records: DNSRecord[]
  domain: string
  dns: string
}

import { fetchDNSQuery } from './fetch-dns-query'
import type { DNSRecord } from './types'

/**
 * Normalize upstream DNS value (same as vercel-dns-tester resolveUpstreamDNS).
 * If URL (http/https), extract host; otherwise use value as-is (IP or hostname).
 * @param value Upstream DNS: IP (e.g. 1.1.1.1), host (e.g. dns.google), or URL. Default 1.1.1.1.
 * @returns Host for https://${host}/dns-query
 */
export function normalizeDnsHost(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return '1.1.1.1'

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed)
      return url.hostname
    } catch {
      return trimmed
    }
  }

  return trimmed
}

export interface ResolveDnsResult {
  records: DNSRecord[]
  domain: string
  dns: string
}

/**
 * Resolve a domain via DoH (application/dns-message), same as vercel-dns-tester.
 * Upstream is used as-is: https://${dns}/dns-query (IP or hostname both work).
 * @param domain Domain to query (required)
 * @param dnsParam Optional DNS server (IP e.g. 1.1.1.1 or host e.g. dns.google); default 1.1.1.1
 * @returns Merged A + AAAA records and display dns
 */
export async function resolveDns(domain: string, dnsParam?: string | null): Promise<ResolveDnsResult> {
  const dns = normalizeDnsHost(dnsParam)
  const displayDns = dnsParam?.trim() || '1.1.1.1'

  const [aRecords, aaaaRecords] = await Promise.all([
    fetchDNSQuery(dns, domain, 'A').catch(() => [] as DNSRecord[]),
    fetchDNSQuery(dns, domain, 'AAAA').catch(() => [] as DNSRecord[]),
  ])

  const records: DNSRecord[] = [...aRecords, ...aaaaRecords]

  return {
    records,
    domain,
    dns: displayDns,
  }
}

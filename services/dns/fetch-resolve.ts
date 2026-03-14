import type { DNSRecord, QueryType } from './types'
import { stringifyDNSType } from './utils'

/** JSON response shape from DoH resolve endpoint (Cloudflare, Google). */
interface DNSResolveResponse {
  Answer?: Array<{
    name: string
    type: number
    TTL: number
    data: string
  }>
}

/**
 * Query DNS using DoH JSON endpoint (GET).
 * - Google: dns.google/resolve?name=...&type=...
 * - Cloudflare: cloudflare-dns.com/dns-query?name=...&type=... with Accept: application/dns-json
 * @param dns DoH host (e.g. cloudflare-dns.com, dns.google)
 * @param domain Domain to resolve
 * @param queryType 'A' or 'AAAA'
 * @returns Parsed DNS records
 */
export async function fetchDNSResolve(dns: string, domain: string, queryType: QueryType): Promise<DNSRecord[]> {
  if (!dns || !domain) {
    throw new Error('DNS and domain are required')
  }

  const isCloudflare = dns === 'cloudflare-dns.com'
  const path = isCloudflare ? 'dns-query' : 'resolve'
  const url = `https://${dns}/${path}?name=${encodeURIComponent(domain)}&type=${queryType}`
  const headers: HeadersInit = isCloudflare ? { Accept: 'application/dns-json' } : {}
  const response = await fetch(url, { method: 'GET', headers })

  if (!response.ok) {
    throw new Error(`DoH resolve failed: ${response.status}`)
  }

  const data: DNSResolveResponse = await response.json()
  if (!data.Answer || data.Answer.length === 0) {
    return []
  }

  return data.Answer.map((answer) => ({
    name: answer.name.replace(/\.$/, ''),
    type: stringifyDNSType(answer.type),
    ttl: answer.TTL,
    data: answer.data,
  }))
}

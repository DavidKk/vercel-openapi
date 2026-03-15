import { generateDNSMessage } from './dns-message'
import type { DNSRecord, QueryType } from './types'
import { stringifyDNSType } from './utils'

/**
 * Perform a DNS query using DoH application/dns-message endpoint.
 * @param dns DoH host (e.g. cloudflare-dns.com, dns.google)
 * @param domain Domain to resolve
 * @param queryType 'A' or 'AAAA'
 * @returns Parsed DNS records from the response
 */
export async function fetchDNSQuery(dns: string, domain: string, queryType: QueryType): Promise<DNSRecord[]> {
  if (!dns || !domain) {
    throw new Error('DNS and domain are required')
  }

  const queryUrl = `https://${dns}/dns-query`
  const dnsMessage = generateDNSMessage(domain, queryType)
  const body = dnsMessage.buffer.slice(dnsMessage.byteOffset, dnsMessage.byteOffset + dnsMessage.byteLength) as ArrayBuffer

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/dns-message' },
    body,
  })

  if (!response.ok) {
    throw new Error(`DoH request failed: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  return parseDNSResponse(buffer)
}

/**
 * Parse application/dns-message response into DNSRecord array.
 * @param buffer Response ArrayBuffer
 * @returns Array of parsed records
 */
function parseDNSResponse(buffer: ArrayBuffer): DNSRecord[] {
  const view = new DataView(buffer)
  const records: DNSRecord[] = []

  const questionCount = view.getUint16(4)
  const answerCount = view.getUint16(6)

  let offset = 12
  for (let i = 0; i < questionCount; i++) {
    offset = skipQuestionSection(view, offset)
  }

  for (let i = 0; i < answerCount; i++) {
    const { name, type, ttl, data, nextOffset } = parseResourceRecord(view, offset)
    records.push({ name, type, ttl, data })
    offset = nextOffset
  }

  return records
}

function skipQuestionSection(view: DataView, offset: number): number {
  while (view.getUint8(offset) !== 0) {
    offset += view.getUint8(offset) + 1
  }
  offset += 1
  return offset + 4
}

function parseResourceRecord(view: DataView, offset: number): { name: string; type: string; ttl: number; data: string; nextOffset: number } {
  const { name, nextOffset: nameOffset } = parseName(view, offset)
  offset = nameOffset

  const type = view.getUint16(offset)
  offset += 2
  offset += 2 // CLASS
  const ttl = view.getUint32(offset)
  offset += 4
  const rdLength = view.getUint16(offset)
  offset += 2

  if (rdLength > view.buffer.byteLength - offset) {
    throw new Error(`Invalid RDLENGTH: ${rdLength}`)
  }

  let data: string
  if (type === 1) {
    data = parseIPv4(view, offset, rdLength)
  } else if (type === 28) {
    data = parseIPv6(view, offset, rdLength)
  } else {
    data = parseRawData(view, offset, rdLength)
  }
  offset += rdLength

  return { name, type: stringifyDNSType(type), ttl, data, nextOffset: offset }
}

function parseName(view: DataView, offset: number): { name: string; nextOffset: number } {
  if (offset >= view.buffer.byteLength) {
    throw new Error(`Offset out of bounds: ${offset}`)
  }

  let name = ''
  let depth = 0
  const maxDepth = 10

  while (depth < maxDepth) {
    if (offset >= view.buffer.byteLength) break

    const length = view.getUint8(offset)
    if (length === 0) {
      offset += 1
      break
    }

    if ((length & 0xc0) === 0xc0) {
      if (offset + 1 >= view.buffer.byteLength) throw new Error('Pointer beyond buffer')
      const pointer = ((length & 0x3f) << 8) | view.getUint8(offset + 1)
      if (pointer >= view.buffer.byteLength) throw new Error('Invalid pointer')
      const { name: pointedName } = parseName(view, pointer)
      name += pointedName
      offset += 2
      break
    }

    if (length > 63) throw new Error(`Invalid label length: ${length}`)
    if (offset + 1 + length > view.buffer.byteLength) throw new Error('Label beyond buffer')

    offset += 1
    const labelBytes = new Uint8Array(view.buffer, offset, length)
    name += new TextDecoder().decode(labelBytes) + '.'
    offset += length
    depth++
  }

  if (name.endsWith('.')) name = name.slice(0, -1)
  return { name, nextOffset: offset }
}

function parseIPv4(view: DataView, offset: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, offset, length)
  return Array.from(bytes).join('.')
}

function parseIPv6(view: DataView, offset: number, length: number): string {
  const bytes = new Uint8Array(view.buffer, offset, length)
  const ip = bytes.reduce((acc, byte, idx) => {
    const hex = byte.toString(16).padStart(2, '0')
    return idx % 2 === 0 ? `${acc}:${hex}` : acc + hex
  }, '')
  return ip.slice(1)
}

function parseRawData(view: DataView, offset: number, length: number): string {
  if (offset + length > view.buffer.byteLength) {
    throw new Error(`Invalid length: ${length} at offset: ${offset}`)
  }
  const bytes = new Uint8Array(view.buffer, offset, length)
  return bytes.length > 1000 ? new TextDecoder().decode(bytes) : String.fromCharCode(...bytes)
}

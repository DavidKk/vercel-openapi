import type { QueryType } from './types'

/**
 * Generate a DNS query message in application/dns-message format.
 * @param domain Domain name to query
 * @param queryType 'A' or 'AAAA'
 * @returns Uint8Array for DoH POST body
 */
export function generateDNSMessage(domain: string, queryType: QueryType): Uint8Array {
  const transactionId = new Uint8Array([0xab, 0xcd])
  const flags = new Uint8Array([0x01, 0x00])
  const questions = new Uint8Array([0x00, 0x01])
  const rrs = new Uint8Array(6)

  const qNameParts = domain.split('.')
  const qName = qNameParts.flatMap((part) => {
    const length = part.length
    const encodedPart = [...new TextEncoder().encode(part)]
    return [length, ...encodedPart]
  })

  const qNameTerminator = [0x00]
  const queryTypeCode = queryType === 'AAAA' ? [0x00, 0x1c] : [0x00, 0x01]
  const queryClass = [0x00, 0x01]

  return new Uint8Array([...transactionId, ...flags, ...questions, ...rrs, ...qName, ...qNameTerminator, ...queryTypeCode, ...queryClass])
}

/**
 * Abbreviate IPv6 for display (collapse longest run of zero segments to ::).
 * @param addr IPv6 or IPv4 address string
 * @returns Abbreviated IPv6 or unchanged string if not IPv6
 */
export function abbreviateIPv6(addr: string): string {
  if (!addr.includes(':')) return addr
  const parts = addr.split(':')
  let bestStart = 0
  let bestLen = 0
  let i = 0
  while (i < parts.length) {
    const seg = parts[i]
    const isZero = seg === '' || /^0+$/.test(seg)
    if (!isZero) {
      i++
      continue
    }
    const start = i
    while (i < parts.length && (parts[i] === '' || /^0+$/.test(parts[i]))) i++
    const len = i - start
    if (len > bestLen) {
      bestStart = start
      bestLen = len
    }
  }
  if (bestLen <= 1) return addr
  const left = parts.slice(0, bestStart).join(':')
  const right = parts.slice(bestStart + bestLen).join(':')
  return (left ? left + ':' : '') + '::' + (right ? ':' + right : '')
}

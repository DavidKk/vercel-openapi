/**
 * Resolve a Clash Tailscale `hostname` from a browser User-Agent.
 * iPhone → iphone, Mac → macbook, Android → android; unknown → device.
 * @param userAgent Navigator userAgent string
 * @returns Suggested Tailscale MagicDNS / peer hostname label
 */
export function resolveTailscaleHostname(userAgent: string): string {
  const ua = userAgent.toLowerCase()

  if (/iphone|ipod/.test(ua)) return 'iphone'
  if (/android/.test(ua)) return 'android'
  /** Desktop Mac (exclude iPadOS desktop UA spoof when clearly mobile). */
  if (/macintosh|mac os x/.test(ua) && !/mobile/.test(ua)) return 'macbook'
  if (/ipad/.test(ua)) return 'ipad'

  return 'device'
}

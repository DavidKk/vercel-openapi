/**
 * Common DoH DNS endpoints for autocomplete (aligned with vercel-dns-tester).
 * value is sent to API as-is (IP or host for https://${value}/dns-query).
 */
export const DNS_ENDPOINT_SUGGESTIONS: { label: string; value: string }[] = [
  { label: 'Cloudflare DNS', value: '1.1.1.1' },
  { label: 'Cloudflare DNS (IPv6)', value: '1.0.0.1' },
  { label: 'Google Public DNS', value: 'dns.google' },
  { label: 'Google DNS (8.8.8.8)', value: '8.8.8.8' },
  { label: 'Google DNS (8.8.4.4)', value: '8.8.4.4' },
  { label: 'Quad9 DNS', value: '9.9.9.9' },
  { label: 'Quad9 (DoH)', value: 'dns.quad9.net' },
  { label: 'OpenDNS', value: '208.67.222.222' },
  { label: 'OpenDNS (Secondary)', value: '208.67.220.220' },
  { label: 'AdGuard DNS', value: '94.140.14.14' },
  { label: 'AdGuard DNS (Family)', value: '94.140.14.15' },
  { label: 'NextDNS', value: '45.90.28.0' },
]

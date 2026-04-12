import { THIRD_PARTY_REJECT_RULE_PROVIDERS } from './clash-overview-constants'

/**
 * Parameters for building the sample Clash YAML shown in the UI.
 * Controls the base URL for rule-provider URLs and optional inclusion of `dns` / `tun` blocks.
 */
export interface BuildClashYamlSnippetTextParams {
  /** Origin + host, e.g. https://example.com */
  baseUrl: string
  /** Clash external-controller API secret placeholder */
  secret: string
  /** Rule-set names / actions from stored config or defaults */
  actions: string[]
  /** When false, omit the YAML top-level `dns:` block. Defaults to true. */
  includeDns?: boolean
  /** When false, omit the YAML top-level `tun:` block. Defaults to true. */
  includeTun?: boolean
}

/**
 * Build sample Clash client YAML using this deployment's public rule-set URLs.
 * @param params Base URL, secret placeholder, and rule action names
 * @returns Trimmed YAML string
 */
export function buildClashYamlSnippetText(params: BuildClashYamlSnippetTextParams): string {
  const { baseUrl, secret, actions, includeDns = true, includeTun = true } = params
  const rules = actions.map((name) => ({ type: 'RULE-SET', name, value: name }))
  const ruleProviders = actions.map((name) => ({
    name,
    type: 'http',
    behavior: 'classical',
    interval: 86400,
    format: 'yaml',
    url: `${baseUrl}/api/proxy-rule/clash/config?type=${encodeURIComponent(name)}`,
    path: `./rules/${name}.yaml`,
  }))

  const providerBlocks = [...ruleProviders, ...THIRD_PARTY_REJECT_RULE_PROVIDERS]
    .map(
      ({ name, type, behavior, interval, format, url, path }) => `
  ${name}:
    type: ${type}
    behavior: ${behavior}
    interval: ${interval}
    format: ${format}
    url: ${url}
    path: ${path}`
    )
    .join('')

  const rulesLines = rules
    .map(({ name }) => {
      const lower = name.trim().toLowerCase()
      if (lower === 'match') return '  - RULE-SET,MATCH,🌐 切换模式'
      if (lower === 'direct') return '  - RULE-SET,DIRECT,DIRECT'
      if (lower === 'reject') return '  - RULE-SET,REJECT,REJECT'
      return `  - RULE-SET,${name},${name}`
    })
    .join('\n')

  const thirdPartyRejectLines = THIRD_PARTY_REJECT_RULE_PROVIDERS.map(({ name }) => `  - RULE-SET,${name},REJECT`).join('\n')

  const dnsBlock = `
dns:
  enable: true
  listen: 127.0.0.1:53
  enhanced-mode: fake-ip
  nameserver:
    - https://cloudflare-dns.com/dns-query
  fallback:
    - 1.1.1.1
  default-nameserver:
    - 1.1.1.1
  fake-ip-range: 198.18.0.1/16
  fallback-filter:
    geoip: true
    ipcidr:
      - 0.0.0.0/8
      - 10.0.0.0/8
      - 100.64.0.0/10
      - 127.0.0.0/8
      - 169.254.0.0/16
      - 172.16.0.0/12
      - 192.168.0.0/16
      - 198.18.0.0/15
      - 224.0.0.0/4
      - 240.0.0.0/4
`

  const tunBlock = `
tun:
  enable: true
  auto-route: true
  bypass:
    - 10.0.0.0/8
    - 172.16.0.0/12
    - 192.168.0.0/16
`

  return `
mixed-port: 7890
allow-lan: true
mode: Rule
external-controller: 127.0.0.1:51498
secret: ${secret}
log-level: info
${includeDns ? dnsBlock : ''}${includeTun ? tunBlock : ''}
proxies:
  - name: Proxy
    server: my.server.com
    port: 443
    type: vmess
    uuid: 00000000-0000-0000-0000-000000000000
    alterId: 0
    cipher: auto
    tls: true
    udp: false
    network: ws
    ws-opts:
      path: /
      headers:
        Host: my.server.com

proxy-groups:
  - name: Proxy
    type: select
    proxies:
      - Proxy
  - name: Streaming
    type: select
    proxies:
      - Proxy
  - name: StreamingSE
    type: select
    proxies:
      - DIRECT
  - name: ChatGPT
    type: select
    proxies:
      - Proxy
  - name: 智能代理(默认走代理)
    type: select
    proxies:
      - Proxy
  - name: 直连模式(系统代理/增强模式)
    type: select
    proxies:
      - DIRECT
  - name: 🌐 切换模式
    type: select
    proxies:
      - 智能代理(默认走代理)
      - 直连模式(系统代理/增强模式)

rule-providers:${providerBlocks}
rules:
${rulesLines}
${thirdPartyRejectLines}
  # Optional: process-name routing (customize if needed)
  - PROCESS-NAME,Codex,Proxy
  - PROCESS-NAME,ChatGPT,Proxy
  - GEOIP,CN,DIRECT
  - MATCH,🌐 切换模式
`.trim()
}

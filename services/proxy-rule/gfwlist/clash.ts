import type { ClashStandardRule } from '@/services/proxy-rule/clash/types'
import { tryGetDomain } from '@/services/proxy-rule/url'

import type { GFWRule } from './parse'

/**
 * Convert parsed gfwlist rules into Clash standard rules (best-effort mapping).
 */
export function convertGfwListToClashRules(rules: GFWRule[]): ClashStandardRule[] {
  const ruleSet = new Set<ClashStandardRule>(
    (function* () {
      for (const { type, value } of rules) {
        switch (type) {
          case 'wildcard': {
            for (const part of value.split('*')) {
              const url = part.replace(/^\.+/, '')
              const domain = tryGetDomain(url)
              if (!domain) {
                continue
              }

              yield { type: 'DOMAIN-SUFFIX', value: domain, action: 'Proxy' }
              break
            }

            break
          }

          case 'path':
          case 'exact_url': {
            const domain = tryGetDomain(value)
            if (!domain) {
              break
            }

            yield { type: 'DOMAIN', value: domain, action: 'Proxy' }
            break
          }

          case 'domain':
          case 'full_match':
          case 'start_with': {
            yield { type: 'DOMAIN', value, action: 'Proxy' }
            break
          }

          case 'end_with': {
            yield { type: 'DOMAIN-SUFFIX', value, action: 'Proxy' }
            break
          }

          case 'domain_keyword': {
            yield { type: 'DOMAIN-KEYWORD', value, action: 'Proxy' }
            break
          }

          case 'whitelist':
          case 'comment':
          case 'regex':
          default: {
            break
          }
        }
      }
    })()
  )

  return Array.from(ruleSet)
}

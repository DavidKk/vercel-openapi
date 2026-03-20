import type { ClashExtendedRule, ClashMatchRule, ClashStandardRule, DefaultAction } from './types'

/**
 * Parse a single Clash rule line into a structured rule, or undefined if unsupported.
 */
export function parseRuleRaw(raw: string, fallbackAction: DefaultAction = 'DIRECT') {
  const [type, ...rest] = raw.split(',')
  switch (type) {
    case 'MATCH': {
      const [action = fallbackAction] = rest
      return { type, action } as ClashMatchRule
    }

    case 'IP-CIDR6': {
      const [value, action = fallbackAction, flag] = rest
      return { type, value, action, flag } as ClashExtendedRule
    }

    case 'DOMAIN':
    case 'DOMAIN-SUFFIX':
    case 'DOMAIN-KEYWORD':
    case 'IP-CIDR':
    case 'SRC-IP-CIDR':
    case 'SRC-PORT':
    case 'DST-PORT':
    case 'PROCESS-NAME':
    case 'GEOIP': {
      const [value, action = fallbackAction] = rest
      return { type, value, action } as ClashStandardRule
    }
    default: {
      return undefined
    }
  }
}

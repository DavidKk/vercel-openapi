export type ClashRuleType = 'DOMAIN' | 'DOMAIN-SUFFIX' | 'DOMAIN-KEYWORD' | 'IP-CIDR' | 'IP-CIDR6' | 'SRC-IP-CIDR' | 'SRC-PORT' | 'DST-PORT' | 'PROCESS-NAME' | 'GEOIP' | 'MATCH'

export type DefaultAction = 'DIRECT' | 'REJECT'

const DEFAULT_ACTION: DefaultAction[] = ['DIRECT', 'REJECT']

function normalizeAction(target: string): string {
  const action = DEFAULT_ACTION.find((a) => a === target.toUpperCase())
  if (action) {
    return action
  }

  return target
}

export interface ClashBaseRule {
  type: ClashRuleType
  action: string
}

export interface ClashMatchRule extends ClashBaseRule {
  type: 'MATCH'
}

export function isClashMatchRule(rule: ClashBaseRule): rule is ClashMatchRule {
  return rule.type === 'MATCH'
}

export function isValidClashMatchRule(rule: ClashRule): boolean {
  return isClashMatchRule(rule) && typeof rule.action === 'string' && !!rule.action
}

export function stringifyClashMatchRule(rule: ClashMatchRule): string {
  return `${rule.type},${normalizeAction(rule.action)}`
}

export interface ClashStandardRule extends ClashBaseRule {
  type: Exclude<ClashRuleType, 'MATCH' | 'IP-CIDR6'>
  value: string
}

/** Rule types shown in the rule editor (includes MATCH and IP-CIDR6). */
export const STANDARD_RULE_TYPES = [
  'DOMAIN',
  'DOMAIN-SUFFIX',
  'DOMAIN-KEYWORD',
  'IP-CIDR',
  'IP-CIDR6',
  'SRC-IP-CIDR',
  'SRC-PORT',
  'DST-PORT',
  'PROCESS-NAME',
  'GEOIP',
  'MATCH',
] as const

const STANDARD_VALUE_TYPES: ClashStandardRule['type'][] = ['DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'IP-CIDR', 'SRC-IP-CIDR', 'SRC-PORT', 'DST-PORT', 'PROCESS-NAME', 'GEOIP']

export function isClashStandardRule(rule: ClashBaseRule): rule is ClashStandardRule {
  return (STANDARD_VALUE_TYPES as readonly string[]).includes(rule.type)
}

export function isValidClashStandardRule(rule: ClashRule): boolean {
  return isClashStandardRule(rule) && typeof rule.action === 'string' && !!rule.action && typeof rule.value === 'string' && !!rule.value
}

export function stringifyClashStandardRule(rule: ClashStandardRule): string {
  return `${rule.type},${rule.value},${normalizeAction(rule.action)}`
}

export interface ClashExtendedRule extends ClashBaseRule {
  type: 'IP-CIDR6'
  value: string
  flag?: string
}

export function isClashExtendedRule(rule: ClashBaseRule): rule is ClashExtendedRule {
  return rule.type === 'IP-CIDR6'
}

export function isValidClashExtendedRule(rule: ClashRule): boolean {
  return isClashExtendedRule(rule) && typeof rule.action === 'string' && !!rule.action && typeof rule.value === 'string' && !!rule.value
}

export function stringifyClashExtendedRule(rule: ClashExtendedRule): string {
  return `${rule.type},${rule.value},${normalizeAction(rule.action)}${rule.flag ? `,${rule.flag}` : ''}`
}

export type ClashRule = ClashMatchRule | ClashStandardRule | ClashExtendedRule

export function isClashRule(rule: ClashBaseRule): rule is ClashRule {
  return isClashMatchRule(rule) || isClashStandardRule(rule) || isClashExtendedRule(rule)
}

export function isValidClashRule(rule: ClashRule): boolean {
  return isValidClashExtendedRule(rule) || isValidClashStandardRule(rule) || isValidClashMatchRule(rule)
}

export function stringifyClashRule(rule: ClashRule): string {
  if (isClashMatchRule(rule)) {
    return stringifyClashMatchRule(rule)
  }

  if (isClashStandardRule(rule)) {
    return stringifyClashStandardRule(rule)
  }

  if (isClashExtendedRule(rule)) {
    return stringifyClashExtendedRule(rule)
  }

  return ''
}

export interface ClashConfig {
  rules?: string[]
}

'use server'

import { parse } from 'yaml'

import { validateCookie } from '@/services/auth/access'
import { CLASH_DEFAULT_ACTION } from '@/services/proxy-rule/clash/constants'
import { loadProxyRuleClashBase, replaceProxyRuleClashRulesInKv } from '@/services/proxy-rule/clash/kv'
import { type ClashRule, type ClashStandardRule, isValidClashRule } from '@/services/proxy-rule/clash/types'
import { parseRuleRaw } from '@/services/proxy-rule/clash/utils'

export interface UiClashRuleRow {
  id?: string
  type: string
  value?: string
  action: string
  flag?: string
}

function rowToClashRule(row: UiClashRuleRow): ClashRule {
  const { type, action } = row
  if (type === 'MATCH') {
    return { type: 'MATCH', action }
  }

  if (type === 'IP-CIDR6') {
    return {
      type: 'IP-CIDR6',
      value: row.value?.trim() ?? '',
      action,
      ...(row.flag ? { flag: row.flag } : {}),
    }
  }

  return {
    type: type as ClashStandardRule['type'],
    value: row.value?.trim() ?? '',
    action,
  } as ClashRule
}

/**
 * Load clash rules for the manage UI (requires login).
 *
 * @returns Parsed rules, distinct actions, and raw YAML config shape
 */
export async function loadProxyRuleClashRulesForManage() {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }
  return loadProxyRuleClashBase()
}

/**
 * Replace clash rules in KV (requires login).
 *
 * @param rows Rule rows from the manage UI (server strips ids)
 */
export async function updateProxyRuleClashRules(rows: UiClashRuleRow[]) {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const rules: ClashRule[] = rows.map((row) => rowToClashRule(row))

  for (const rule of rules) {
    if (!isValidClashRule(rule)) {
      throw new Error('Invalid rule payload')
    }
  }

  await replaceProxyRuleClashRulesInKv(rules)
}

export interface ImportProxyRuleClashResult {
  imported: number
  skipped: number
  rules: ClashRule[]
  actions: string[]
}

/**
 * Parse clash rules from YAML text (no KV write).
 *
 * YAML input can be either:
 * - a root array of rule strings
 * - an object with `rules: string[]`
 *
 * Each rule string is parsed via the project's Clash parser.
 *
 * @param yamlText YAML string content
 * @returns Import result including parsed rules/actions
 */
export async function importProxyRuleClashRulesFromYamlText(yamlText: string): Promise<ImportProxyRuleClashResult> {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  if (!yamlText || !yamlText.trim()) {
    throw new Error('YAML text is empty')
  }

  let parsed: unknown
  try {
    parsed = parse(yamlText)
  } catch {
    throw new Error('Invalid YAML text')
  }

  const rulesRaw: unknown = Array.isArray(parsed) ? parsed : (parsed as any)?.rules
  if (!Array.isArray(rulesRaw)) {
    throw new Error('Invalid YAML format: expected an array or { rules: string[] }')
  }

  const rules: ClashRule[] = []
  let skipped = 0
  for (const entry of rulesRaw) {
    if (typeof entry !== 'string') {
      skipped += 1
      continue
    }
    const rule = parseRuleRaw(entry)
    if (!rule || !isValidClashRule(rule)) {
      skipped += 1
      continue
    }
    rules.push(rule)
  }

  const actionSet = new Set<string>(CLASH_DEFAULT_ACTION)
  for (const r of rules) {
    actionSet.add(r.action)
  }

  return {
    imported: rules.length,
    skipped,
    rules,
    actions: Array.from(actionSet),
  }
}

'use server'

import { validateCookie } from '@/services/auth/access'
import { getGistInfo } from '@/services/gist'
import { fetchClashRules, updateClashRules } from '@/services/proxy-rule/clash/rule'
import { type ClashRule, type ClashStandardRule, isValidClashRule } from '@/services/proxy-rule/clash/types'

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
 * Load clash rules from gist for the manage UI (requires login).
 * @returns Parsed rules, distinct actions, and raw YAML config shape
 */
export async function loadProxyRuleClashRulesForManage() {
  if (!(await validateCookie())) {
    throw new Error('Not authorized')
  }

  const { gistId, gistToken } = getGistInfo()
  return fetchClashRules({ gistId, gistToken })
}

/**
 * Persist clash rules to gist (requires login).
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

  const { gistId, gistToken } = getGistInfo()
  await updateClashRules({ gistId, gistToken, rules })
}

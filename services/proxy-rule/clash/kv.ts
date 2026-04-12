import { getJsonKv, setJsonKv } from '@/services/kv/client'

import { CLASH_DEFAULT_ACTION, DEFAULT_PROXY_RULE_CLASH_FILE_NAME } from './constants'
import type { ClashRule } from './types'
import { stringifyClashRule } from './types'

/** KV key that stores the admin/cache snapshot for proxy-rule clash config. */
export const PROXY_RULE_CLASH_BASE_KV_KEY = 'proxy-rule:clash:base:v1'

export interface FetchClashRulesResult {
  rules: ClashRule[]
  actions: string[]
  /**
   * Parsed YAML config shape.
   * We keep it loosely typed because the KV snapshot may contain additional keys.
   */
  config: Record<string, unknown>
  /** File name used for reads/writes in older remote-file implementations */
  fileName: string
}

/**
 * Load the cached clash rules base from KV.
 *
 * @returns Cached clash rules base or null when missing/unavailable
 */
export async function loadProxyRuleClashBaseFromKv(): Promise<FetchClashRulesResult | null> {
  const cached = await getJsonKv<FetchClashRulesResult>(PROXY_RULE_CLASH_BASE_KV_KEY)
  if (!cached) return null
  if (!Array.isArray(cached.rules)) return null
  if (!Array.isArray(cached.actions)) return null
  return cached
}

/**
 * Load clash rules base for runtime use.
 * - Prefer KV
 * - Fallback to empty rules with default actions
 *
 * @returns Clash rules base for merging and admin UI
 */
export async function loadProxyRuleClashBase(): Promise<FetchClashRulesResult> {
  const cached = await loadProxyRuleClashBaseFromKv()
  if (cached) return cached

  return {
    rules: [],
    actions: Array.from(CLASH_DEFAULT_ACTION),
    config: {},
    fileName: DEFAULT_PROXY_RULE_CLASH_FILE_NAME,
  }
}

/**
 * Replace clash rules in KV while preserving the parsed YAML config shape when available.
 *
 * @param rules Updated clash rules list
 * @returns The updated clash rules base
 */
export async function replaceProxyRuleClashRulesInKv(rules: ClashRule[]): Promise<FetchClashRulesResult> {
  const cached = await loadProxyRuleClashBaseFromKv()
  const config = (cached?.config ?? {}) as Record<string, unknown>

  const parts = rules.map((r) => stringifyClashRule(r)).filter((s) => !!s)
  const nextConfig = { ...config, rules: parts }

  const actionSet = new Set<string>(CLASH_DEFAULT_ACTION)
  for (const rule of rules) {
    actionSet.add(rule.action)
  }
  const actions = Array.from(actionSet)

  const next: FetchClashRulesResult = {
    rules,
    actions,
    config: nextConfig as FetchClashRulesResult['config'],
    fileName: cached?.fileName ?? DEFAULT_PROXY_RULE_CLASH_FILE_NAME,
  }

  await setJsonKv(PROXY_RULE_CLASH_BASE_KV_KEY, next)
  return next
}

import { createLogger } from '@/services/logger'

import { loadProxyRuleClashBase } from './clash/kv'
import { type ClashExtendedRule, type ClashMatchRule, type ClashStandardRule, stringifyClashRule } from './clash/types'
import { convertGfwListToClashRules } from './gfwlist/clash'
import { fetchGfwListRules } from './gfwlist/fetch-list'
import { convertZeroOmegaToClashRules } from './zero-omega/clash'
import { loadZeroOmegaConfig } from './zero-omega/load'

const logger = createLogger('proxy-rule-merge')

type MutableRule = ClashMatchRule | ClashExtendedRule | ClashStandardRule

/**
 * Build merged Clash RULE-SET line prefixes filtered by action (case-insensitive), de-duplicated.
 * @param matchAction Clash rule action to match (e.g. Proxy)
 * @returns Unique rule line prefixes without trailing action segment
 */
export async function buildMergedClashRulePayload(matchAction: string): Promise<string[]> {
  const { rules: baseRules } = await loadProxyRuleClashBase()
  const rules: MutableRule[] = [...baseRules]

  const zeroOmega = await loadZeroOmegaConfig()
  if (zeroOmega) {
    rules.splice(0, 0, ...convertZeroOmegaToClashRules(zeroOmega))
  }

  let gfwRules: Awaited<ReturnType<typeof fetchGfwListRules>> = []
  try {
    gfwRules = await fetchGfwListRules()
  } catch (error) {
    logger.warn('gfwlist merge skipped', { error })
  }

  if (gfwRules.length > 0) {
    rules.splice(0, 0, ...convertGfwListToClashRules(gfwRules))
  }

  const upper = matchAction.toUpperCase()
  return Array.from(
    new Set(
      (function* () {
        for (const rule of rules) {
          if (rule.action.toUpperCase() !== upper) {
            continue
          }

          const content = stringifyClashRule(rule)
          const parts = content.split(',')
          const index = parts.indexOf(rule.action)
          const result = parts.slice(0, index).join(',')
          if (!result) {
            continue
          }

          yield result
        }
      })()
    )
  )
}

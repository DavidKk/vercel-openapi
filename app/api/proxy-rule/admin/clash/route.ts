import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { createLogger } from '@/services/logger'
import { loadProxyRuleClashBase, replaceProxyRuleClashRulesInKv } from '@/services/proxy-rule/clash/kv'
import { type ClashRule, isValidClashRule } from '@/services/proxy-rule/clash/types'

export const runtime = 'edge'

const logger = createLogger('api-proxy-rule-admin-clash')

/**
 * Authenticated: return current clash rules and action list from gist.
 */
export const GET = api(
  withAuthHandler(async () => {
    logger.info('get rules')
    const { rules, actions } = await loadProxyRuleClashBase()
    return jsonSuccess({ rules, actions }, { headers: cacheControlNoStoreHeaders() })
  })
)

/**
 * Authenticated: replace KV clash rules with the provided list.
 * Body: { rules: ClashRule[] }
 */
export const POST = api(
  withAuthHandler(async (req: NextRequest) => {
    const body = (await req.json()) as { rules?: unknown }
    const { rules: rawRules } = body
    if (!Array.isArray(rawRules)) {
      return jsonInvalidParameters('rules must be an array', { headers: cacheControlNoStoreHeaders() })
    }

    if (rawRules.some((rule) => !isValidClashRule(rule as ClashRule))) {
      return jsonInvalidParameters('invalid rule in rules array', { headers: cacheControlNoStoreHeaders() })
    }

    const rules = rawRules as ClashRule[]
    logger.info('update rules', { count: rules.length })

    await replaceProxyRuleClashRulesInKv(rules)
    return jsonSuccess({ ok: true }, { headers: cacheControlNoStoreHeaders() })
  })
)

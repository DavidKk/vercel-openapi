import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { withAuthHandler } from '@/initializer/wrapper'
import { getGistInfo } from '@/services/gist'
import { createLogger } from '@/services/logger'
import { fetchClashRules, updateClashRules } from '@/services/proxy-rule/clash/rule'
import { type ClashRule, isValidClashRule } from '@/services/proxy-rule/clash/types'

export const runtime = 'edge'

const logger = createLogger('api-proxy-rule-admin-clash')

/**
 * Authenticated: return current clash rules and action list from gist.
 */
export const GET = api(
  withAuthHandler(async () => {
    logger.info('get rules')
    const { gistId, gistToken } = getGistInfo()
    const { rules, actions } = await fetchClashRules({ gistId, gistToken })
    return jsonSuccess({ rules, actions })
  })
)

/**
 * Authenticated: replace gist clash rules with the provided list.
 * Body: { rules: ClashRule[] }
 */
export const POST = api(
  withAuthHandler(async (req: NextRequest) => {
    const body = (await req.json()) as { rules?: unknown }
    const { rules: rawRules } = body
    if (!Array.isArray(rawRules)) {
      return jsonInvalidParameters('rules must be an array')
    }

    if (rawRules.some((rule) => !isValidClashRule(rule as ClashRule))) {
      return jsonInvalidParameters('invalid rule in rules array')
    }

    const rules = rawRules as ClashRule[]
    logger.info('update rules', { count: rules.length })
    const { gistId, gistToken } = getGistInfo()
    await updateClashRules({ gistId, gistToken, rules })
    return jsonSuccess({ ok: true })
  })
)

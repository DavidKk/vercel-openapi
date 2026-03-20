import { parse, stringify } from 'yaml'

import { fetchGist, type FetchGistFileParams, writeGistFile } from '@/services/gist'
import { createLogger } from '@/services/logger'

import { CLASH_DEFAULT_ACTION, getOrderedClashGistFileCandidates, getProxyRuleClashFileName } from './constants'
import type { ClashConfig, ClashExtendedRule, ClashMatchRule, ClashRule, ClashStandardRule } from './types'
import { stringifyClashRule } from './types'
import { parseRuleRaw } from './utils'

const logger = createLogger('proxy-rule-clash')

/**
 * Pick the clash gist file to read and the YAML body, or null content if none exists yet.
 */
async function resolveClashGistFile(params: FetchGistFileParams): Promise<{
  fileName: string
  content: string | null
}> {
  const { gistId, gistToken } = params
  const gist = await fetchGist({ gistId, gistToken })
  const candidates = getOrderedClashGistFileCandidates()
  for (const fileName of candidates) {
    const file = gist.files[fileName]
    if (file && typeof file.content === 'string') {
      return { fileName, content: file.content }
    }
  }
  return { fileName: getProxyRuleClashFileName(), content: null }
}

export interface FetchClashRulesResult {
  rules: (ClashMatchRule | ClashExtendedRule | ClashStandardRule)[]
  actions: string[]
  config: ClashConfig
  /** Gist filename used for reads and subsequent writes */
  fileName: string
}

/**
 * Load clash rules and available actions from the gist YAML file.
 * Tries PROXY_RULE_CLASH_FILE, then default, then legacy vercel-proxy-rule filename.
 * @param params Gist id and token
 * @returns Parsed rules, distinct actions, raw config, and resolved gist filename
 */
export async function fetchClashRules(params: FetchGistFileParams): Promise<FetchClashRulesResult> {
  const { gistId, gistToken } = params
  const { fileName, content } = await resolveClashGistFile({ gistId, gistToken })

  let config: ClashConfig = {}
  if (content !== null && content.trim().length > 0) {
    try {
      config = parse(content) as ClashConfig
    } catch (error) {
      logger.warn('fetchClashRules: failed to parse YAML', { gistId, fileName, error })
      config = {}
    }
  }

  const strRules = config?.rules

  const rules: (ClashMatchRule | ClashExtendedRule | ClashStandardRule)[] = []
  if (!Array.isArray(strRules) || strRules.length === 0) {
    return {
      rules,
      actions: Array.from(CLASH_DEFAULT_ACTION),
      config,
      fileName,
    }
  }

  const actionSet = new Set<string>(CLASH_DEFAULT_ACTION)
  for (const ruleRaw of strRules) {
    const rule = parseRuleRaw(ruleRaw)
    if (!rule) {
      continue
    }

    actionSet.add(rule.action)
    rules.push(rule)
  }

  const actions = Array.from(actionSet)
  return { rules, actions, config, fileName }
}

export interface UpdateClashRulesParams extends FetchGistFileParams {
  rules: ClashRule[]
}

/**
 * Replace the rules section in the gist clash file while preserving other YAML keys.
 * @param params Gist credentials and full rule list to persist
 */
export async function updateClashRules(params: UpdateClashRulesParams) {
  const { gistId, gistToken, rules } = params
  const { config, fileName } = await fetchClashRules({ gistId, gistToken })

  const parts: string[] = []
  for (const rule of rules) {
    const content = stringifyClashRule(rule)
    if (!content) {
      continue
    }

    parts.push(content)
  }

  const nextContent = stringify({ ...config, rules: parts })
  await writeGistFile({ gistId, gistToken, fileName, content: nextContent })
}

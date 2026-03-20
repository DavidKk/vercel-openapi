import { getGistInfo } from '@/services/gist'

import { CLASH_DEFAULT_ACTION } from './constants'
import { fetchClashRules } from './rule'

/**
 * Resolve distinct Clash rule actions for the overview YAML sample.
 * Uses gist when configured; otherwise returns default action labels.
 * @returns Action names (e.g. Proxy, DIRECT) for RULE-SET entries in the sample config
 */
export async function loadProxyRuleSnippetActions(): Promise<string[]> {
  try {
    const { gistId, gistToken } = getGistInfo()
    const { actions } = await fetchClashRules({ gistId, gistToken })
    return actions.length > 0 ? actions : [...CLASH_DEFAULT_ACTION]
  } catch {
    return [...CLASH_DEFAULT_ACTION]
  }
}

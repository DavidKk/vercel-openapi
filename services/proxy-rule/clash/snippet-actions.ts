import { CLASH_DEFAULT_ACTION } from './constants'
import { loadProxyRuleClashBase } from './kv'

/**
 * Resolve distinct Clash rule actions for the overview YAML sample.
 * Uses stored rules when configured; otherwise returns default action labels.
 * @returns Action names (e.g. Proxy, DIRECT) for RULE-SET entries in the sample config
 */
export async function loadProxyRuleSnippetActions(): Promise<string[]> {
  const base = await loadProxyRuleClashBase()
  return base.actions.length > 0 ? base.actions : [...CLASH_DEFAULT_ACTION]
}

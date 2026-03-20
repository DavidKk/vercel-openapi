import { randomUUID } from 'node:crypto'

import { loadProxyRuleSnippetActions } from '@/services/proxy-rule/clash/snippet-actions'

import { ProxyRuleOverviewClient } from './ProxyRuleOverviewClient'

/**
 * Proxy rule overview: title row with Copy, sample Clash YAML (full remaining height).
 */
export default async function ProxyRulePage() {
  const snippetActions = await loadProxyRuleSnippetActions()
  const clashSnippetSecret = randomUUID()

  return (
    <section className="flex h-full min-h-0 flex-col">
      <ProxyRuleOverviewClient secret={clashSnippetSecret} actions={snippetActions} />
    </section>
  )
}
